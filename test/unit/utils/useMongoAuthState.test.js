import { describe, it, expect, jest, beforeAll, beforeEach } from '@jest/globals'

const initAuthCredsMock = jest.fn(() => ({ me: 'abc@wa', noiseKey: 'enc:noise' }))
const BufferJSONMock = {
  replacer: (k, v) => v,
  reviver: (k, v) => (typeof v === 'string' && v.startsWith('enc:') ? `dec:${v.slice(4)}` : v),
}

const removeMock = jest.fn()
const updateKeysMock = jest.fn()
const updateCredsMock = jest.fn()
const getOrCreateMock = jest.fn()

jest.unstable_mockModule('baileys', () => ({
  initAuthCreds: initAuthCredsMock,
  BufferJSON: BufferJSONMock,
}))

jest.unstable_mockModule('../../../src/services/auth.js', () => ({
  default: {
    getOrCreate: getOrCreateMock,
    remove: removeMock,
    updateKeys: updateKeysMock,
    updateCreds: updateCredsMock,
  },
}))

let useMongoAuthState
beforeAll(async () => {
  const mod = await import('../../../src/utils/useMongoAuthState.js')
  useMongoAuthState = mod.useMongoAuthState
})

describe('[Unit][utils.useMongoAuthState]', () => {
  const sessionId = 'sess-123'

  beforeEach(() => {
    jest.clearAllMocks()

    getOrCreateMock.mockResolvedValue({
      _id: sessionId,
      creds: { me: 'abc@wa', noiseKey: 'enc:noise' },
      keys: {
        'pre-key': { 1: 'pre1', 2: 'pre2' },
        'app-state-sync-key': { s1: 'enc:SYNC1', s2: 'enc:SYNC2' },
      },
    })
  })

  it('should call AuthService.getOrCreate with serialized initAuthCreds()', async () => {
    await useMongoAuthState(sessionId)

    expect(initAuthCredsMock).toHaveBeenCalledTimes(1)
    const [, serializedCreds] = getOrCreateMock.mock.calls[0]
    expect(serializedCreds).toEqual({ me: 'abc@wa', noiseKey: 'enc:noise' })
  })

  it('should return state with creds and keys helpers', async () => {
    const { state, saveCreds, clear } = await useMongoAuthState(sessionId)

    expect(typeof state).toBe('object')
    expect(state.creds).toEqual({ me: 'abc@wa', noiseKey: 'dec:noise' })
    expect(typeof state.keys.get).toBe('function')
    expect(typeof state.keys.set).toBe('function')
    expect(typeof saveCreds).toBe('function')
    expect(typeof clear).toBe('function')
  })

  it('should clear the session by calling AuthService.remove', async () => {
    const { clear } = await useMongoAuthState(sessionId)

    await clear()

    expect(removeMock).toHaveBeenCalledWith(sessionId)
  })

  describe('state.keys.get', () => {
    it('should return only existing ids for a given key type', async () => {
      const { state } = await useMongoAuthState(sessionId)

      const result = await state.keys.get('pre-key', ['1', 'x', '2'])

      expect(result).toEqual({ 1: 'pre1', 2: 'pre2' })
    })

    it('should revive values when type is "app-state-sync-key" using BufferJSON.reviver', async () => {
      const { state } = await useMongoAuthState(sessionId)

      const result = await state.keys.get('app-state-sync-key', ['s1', 's2'])

      expect(result).toEqual({ s1: 'dec:SYNC1', s2: 'dec:SYNC2' })
    })

    it('should return empty object when none of the ids exist', async () => {
      const { state } = await useMongoAuthState(sessionId)

      const result = await state.keys.get('pre-key', ['999', '888'])

      expect(result).toEqual({})
    })
  })

  describe('state.keys.set', () => {
    it('should merge new key material and call AuthService.updateKeys with serialized keys', async () => {
      const { state } = await useMongoAuthState(sessionId)

      await state.keys.set({
        'pre-key': { 3: 'pre3' },
        session: { A: 'enc:SESS-A' },
      })

      expect(updateKeysMock).toHaveBeenCalledTimes(1)
      const [calledSessionId, serializedKeys] = updateKeysMock.mock.calls[0]
      expect(calledSessionId).toBe(sessionId)

      expect(serializedKeys).toEqual({
        'pre-key': { 1: 'pre1', 2: 'pre2', 3: 'pre3' },
        'app-state-sync-key': { s1: 'dec:SYNC1', s2: 'dec:SYNC2' },
        session: { A: 'enc:SESS-A' },
      })
    })
  })

  describe('saveCreds', () => {
    it('should call AuthService.updateCreds with serialized creds', async () => {
      const { saveCreds } = await useMongoAuthState(sessionId)
      await saveCreds()
      expect(updateCredsMock).toHaveBeenCalledTimes(1)
      const [calledSessionId, serializedCreds] = updateCredsMock.mock.calls[0]
      expect(calledSessionId).toBe(sessionId)
      expect(serializedCreds).toEqual({ me: 'abc@wa', noiseKey: 'dec:noise' })
    })
  })
})
