import {
  jest,
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  afterAll,
} from '@jest/globals'

class TinyEmitter {
  constructor() {
    this.handlers = {}
  }
  on(evt, fn) {
    ;(this.handlers[evt] ??= new Set()).add(fn)
  }
  off(evt, fn) {
    this.handlers[evt]?.delete(fn)
  }
  emit(evt, payload) {
    this.handlers[evt]?.forEach((fn) => fn(payload))
  }
  reset() {
    this.handlers = {}
  }
}

const flushMicrotasks = async () => {
  await Promise.resolve()
  await Promise.resolve()
}

// ---------- Mocks (ESM-safe) ----------
const mockEv = new TinyEmitter()
const mockSock = { ev: mockEv, sendMessage: jest.fn(), end: jest.fn() }
const mockMakeWASocket = jest.fn(() => mockSock)
const mockFetchLatestBaileysVersion = jest.fn(async () => ({ version: [2, 9999, 9] }))
const mockPino = jest.fn(() => ({}))
const mockToDataURL = jest.fn(
  async (qr) => `data:image/png;base64,${Buffer.from(qr).toString('base64')}`
)
const mockSaveCreds = jest.fn()
const mockClear = jest.fn()
const mockUseMongoAuthState = jest.fn(async (sessionId) => ({
  state: { _mock: 'state', sessionId },
  saveCreds: mockSaveCreds,
  clear: mockClear,
}))
class SocketError extends Error {
  constructor(message) {
    super(message)
    this.name = 'SocketError'
  }
}

jest.unstable_mockModule('baileys', () => ({
  makeWASocket: mockMakeWASocket,
  fetchLatestBaileysVersion: mockFetchLatestBaileysVersion,
  DisconnectReason: { restartRequired: 515, loggedOut: 401 },
}))
jest.unstable_mockModule('pino', () => ({ default: mockPino }))
jest.unstable_mockModule('qrcode', () => ({
  default: { toDataURL: mockToDataURL },
  toDataURL: mockToDataURL,
}))
jest.unstable_mockModule('../../../src/utils/useMongoAuthState.js', () => ({
  useMongoAuthState: mockUseMongoAuthState,
}))
jest.unstable_mockModule('../../../src/errors/index.js', () => ({ SocketError }))

let getSocket, getQR, sendMessage, waitUntilConnected
let logSpy
beforeAll(async () => {
  logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
  const mod = await import('../../../src/socket/whatsapp.js')
  ;({ getSocket, getQR, sendMessage, waitUntilConnected } = mod)
})

afterAll(() => {
  logSpy?.mockRestore()
})

let sidCounter = 0
const newSessionId = (prefix = 'session') => `${prefix}-${Date.now()}-${++sidCounter}`

describe('[Unit][socket.whatsapp]', () => {
  let sessionId

  beforeEach(() => {
    sessionId = newSessionId('t')
    jest.clearAllMocks()
    mockSock.ev = mockEv
    mockSock.sendMessage.mockReset()
    mockMakeWASocket.mockClear()
    mockEv.reset()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.runOnlyPendingTimers()
    jest.clearAllTimers()
    jest.useRealTimers()
  })

  describe('getSocket', () => {
    it('should create a new socket if session does not exist', async () => {
      const s = await getSocket(sessionId)

      expect(mockUseMongoAuthState).toHaveBeenCalledWith(sessionId)
      expect(mockFetchLatestBaileysVersion).toHaveBeenCalled()
      expect(mockMakeWASocket).toHaveBeenCalledWith(
        expect.objectContaining({
          auth: expect.any(Object),
          version: expect.any(Array),
          printQRInTerminal: false,
          browser: ['Chrome (Linux)', 'Chrome', '120.0.0.0'],
        })
      )
      expect(s).toBe(mockSock)
    })

    it('should return the existing socket if already initialized', async () => {
      const first = await getSocket(sessionId)
      const second = await getSocket(sessionId)

      expect(first).toBe(mockSock)
      expect(second).toBe(mockSock)
      expect(mockMakeWASocket).toHaveBeenCalledTimes(1)
    })
  })

  describe('getQR', () => {
    it('should return "connected" immediately if session already connected', async () => {
      await getSocket(sessionId)
      mockEv.emit('connection.update', { connection: 'open' })
      await flushMicrotasks()

      const result = await getQR(sessionId, 200)
      expect(result).toBe('connected')
    })

    it('should return cached QR data URL when status is "qr" with lastQR', async () => {
      await getSocket(sessionId)
      mockEv.emit('connection.update', { qr: 'qr-1' })
      await flushMicrotasks()

      const result = await getQR(sessionId, 200)
      expect(result).toMatch(/^data:image\/png;base64,/)
      expect(mockToDataURL).toHaveBeenCalled()
    })

    it('should resolve "connected" when connection.update emits open before timeout', async () => {
      await getSocket(sessionId)
      const p = getQR(sessionId, 1000)
      setTimeout(() => mockEv.emit('connection.update', { connection: 'open' }), 10)
      jest.advanceTimersByTime(20)
      await expect(p).resolves.toBe('connected')
    })

    it('should resolve with fresh QR when connection.update emits qr before timeout', async () => {
      await getSocket(sessionId)
      const p = getQR(sessionId, 1000)
      setTimeout(() => mockEv.emit('connection.update', { qr: 'qr-fresh' }), 10)
      jest.advanceTimersByTime(20)
      const result = await p
      expect(result).toMatch(/^data:image\/png;base64,/)
      expect(mockToDataURL).toHaveBeenCalledWith('qr-fresh', { width: 300, margin: 2 })
    })

    it('should reject with SocketError on timeout when nothing arrives', async () => {
      await getSocket(sessionId)
      const p = getQR(sessionId, 50)
      jest.advanceTimersByTime(60)
      await expect(p).rejects.toThrow(new SocketError('Timeout waiting for QR Code, Try again'))
    })

    it('should call getSocket when there is no session yet (no-session branch)', async () => {
      const sid = newSessionId('existing session')
      mockMakeWASocket.mockClear()
      const p = getQR(sid, 200)
      await flushMicrotasks()
      mockEv.emit('connection.update', { connection: 'open' })
      await flushMicrotasks()
      await expect(p).resolves.toBe('connected')
      expect(mockMakeWASocket).toHaveBeenCalledTimes(1)
    })
  })

  describe('sendMessage', () => {
    it('should wait until connected and send a text message to formatted jid', async () => {
      await getSocket(sessionId)
      const sendP = sendMessage(sessionId, '5511999999999', { text: 'hello' })
      setTimeout(() => mockEv.emit('connection.update', { connection: 'open' }), 5)
      jest.advanceTimersByTime(10)
      await sendP
      expect(mockSock.sendMessage).toHaveBeenCalledWith('5511999999999@s.whatsapp.net', {
        text: 'hello',
      })
    })

    it('should not reformat jid if number already includes @s.whatsapp.net', async () => {
      await getSocket(sessionId)
      const jid = '5511888888888@s.whatsapp.net'
      const sendP = sendMessage(sessionId, jid, { text: 'oi' })
      setTimeout(() => mockEv.emit('connection.update', { connection: 'open' }), 1)
      jest.advanceTimersByTime(5)
      await sendP
      expect(mockSock.sendMessage).toHaveBeenCalledWith(jid, { text: 'oi' })
    })

    it('should send image with caption when imgPath is provided', async () => {
      await getSocket(sessionId)
      const sendP = sendMessage(sessionId, '5511777777777', {
        text: 'foto',
        imgPath: '/tmp/pic.png',
      })
      setTimeout(() => mockEv.emit('connection.update', { connection: 'open' }), 1)
      jest.advanceTimersByTime(5)
      await sendP
      expect(mockSock.sendMessage).toHaveBeenCalledWith('5511777777777@s.whatsapp.net', {
        image: { url: '/tmp/pic.png' },
        caption: 'foto',
      })
    })
  })

  describe('connection close behavior', () => {
    it('should schedule a retry when closed with status == restartRequired', async () => {
      await getSocket(sessionId)
      mockEv.emit('connection.update', {
        connection: 'close',
        lastDisconnect: { error: { output: { statusCode: 515 } } },
      })
      await flushMicrotasks()

      expect(mockMakeWASocket).toHaveBeenCalledTimes(2)
    })

    it('should call clear(sessionId) and not schedule retry when closed due to loggedOut', async () => {
      await getSocket(sessionId)
      mockEv.emit('connection.update', {
        connection: 'close',
        lastDisconnect: { error: { output: { statusCode: 401 } } },
      })
      await flushMicrotasks()
      expect(mockClear).toHaveBeenCalledWith(sessionId)
    })
  })

  describe('waitUntilConnected', () => {
    it('should reject with SocketError when session is not present', async () => {
      const p = waitUntilConnected('nosession', 50)
      await expect(p).rejects.toThrow(new SocketError('No session found'))
    })

    it('should return true if session is connected', async () => {
      const sessionId = 'existing-session'
      await getSocket(sessionId)
      const p = waitUntilConnected(sessionId, 200)
      await flushMicrotasks()
      mockEv.emit('connection.update', { connection: 'open' })
      await flushMicrotasks()
      await expect(p).resolves.toBe(true)
    })

    it('should throw an error when status is qr', async () => {
      await getSocket(sessionId)
      mockEv.emit('connection.update', { qr: 'some-qr' })
      await flushMicrotasks()
      const p = waitUntilConnected(sessionId, 200)
      await expect(p).rejects.toThrow(new SocketError('QR not scanned — session not authenticated'))
    })

    it('should throw an error when connection is closed bed', async () => {
      await getSocket(sessionId)
      const p = waitUntilConnected(sessionId, 200)
      mockEv.emit('connection.update', { connection: 'close' })
      await flushMicrotasks()

      await expect(p).rejects.toThrow(new SocketError('Connection closed before ready'))
    })

    it('should throw an error when session is not authenticated', async () => {
      await getSocket(sessionId)
      const p = waitUntilConnected(sessionId, 200)
      mockEv.emit('connection.update', { qr: 'test-qr' })
      await flushMicrotasks()
      await expect(p).rejects.toThrow(new SocketError('QR not scanned — session not authenticated'))
    })

    it('should throw an error when no event is fired', async () => {
      await getSocket(sessionId)
      const p = waitUntilConnected(sessionId, 50)
      jest.advanceTimersByTime(60)
      await expect(p).rejects.toThrow(new SocketError('Timeout waiting for connection'))
    })
  })
})
