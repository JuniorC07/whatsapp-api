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
const mockSock = { ev: mockEv, sendMessage: jest.fn() }
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
  DisconnectReason: { loggedOut: 401 },
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

let getSocket, getQR, sendMessage
let logSpy
beforeAll(async () => {
  logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
  const mod = await import('../../../src/socket/whatsapp.js')
  ;({ getSocket, getQR, sendMessage } = mod)
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
      await expect(p).rejects.toThrow(new SocketError('Timeout waiting for QR Code'))
    })

    it('should call getSocket when there is no session yet (no-session branch)', async () => {
      const sid = newSessionId('qr-nosession')
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
    it('should schedule a retry when closed with status != loggedOut', async () => {
      const spySetTimeout = jest.spyOn(global, 'setTimeout')
      await getSocket(sessionId)
      mockEv.emit('connection.update', {
        connection: 'close',
        lastDisconnect: { error: { output: { statusCode: 500 } } },
      })
      await flushMicrotasks()
      expect(spySetTimeout).toHaveBeenCalled()
      expect(spySetTimeout.mock.calls[0][1]).toBe(1000)
      jest.runOnlyPendingTimers() // consome retry
    })

    it('should call clear(sessionId) and not schedule retry when closed due to loggedOut', async () => {
      const spySetTimeout = jest.spyOn(global, 'setTimeout')
      await getSocket(sessionId)
      mockEv.emit('connection.update', {
        connection: 'close',
        lastDisconnect: { error: { output: { statusCode: 401 } } },
      })
      await flushMicrotasks()
      expect(mockClear).toHaveBeenCalledWith(sessionId)
      expect(spySetTimeout).not.toHaveBeenCalled()
    })
  })
})
