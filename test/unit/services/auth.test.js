import { jest, describe, it, expect, beforeEach } from '@jest/globals'

const mockFns = {
  findById: jest.fn(),
  create: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
}

jest.unstable_mockModule('../../../src/models/Auth.js', () => ({
  default: mockFns,
}))

const AuthModel = (await import('../../../src/models/Auth.js')).default
const repo = (await import('../../../src/services/auth.js')).default

describe('[Unit][services.auth]', () => {
  const sessionId = 'session-123'
  const creds = { token: 'abc', ts: 1 }
  const keys = { noiseKey: 'xxx', idKey: 'yyy' }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getOrCreate', () => {
    it('should return the existing document if it exists', async () => {
      const existing = { _id: sessionId, creds: { token: 'old' }, keys: {} }
      AuthModel.findById.mockResolvedValue(existing)

      const result = await repo.getOrCreate(sessionId, creds)

      expect(AuthModel.findById).toHaveBeenCalledWith(sessionId)
      expect(AuthModel.create).not.toHaveBeenCalled()
      expect(result).toBe(existing)
    })

    it('should create a new document when none is found', async () => {
      AuthModel.findById.mockResolvedValue(null)
      const created = { _id: sessionId, creds, keys: {} }
      AuthModel.create.mockResolvedValue(created)

      const result = await repo.getOrCreate(sessionId, creds)

      expect(AuthModel.create).toHaveBeenCalledWith({
        _id: sessionId,
        creds,
        keys: {},
      })
      expect(result).toBe(created)
    })
  })

  describe('updateCreds', () => {
    it('should update creds and return the new document', async () => {
      const updated = { _id: sessionId, creds, keys: {} }
      AuthModel.findByIdAndUpdate.mockResolvedValue(updated)

      const result = await repo.updateCreds(sessionId, creds)

      expect(AuthModel.findByIdAndUpdate).toHaveBeenCalledWith(
        sessionId,
        { $set: { creds } },
        { new: true }
      )
      expect(result).toBe(updated)
    })
  })

  describe('updateKeys', () => {
    it('should update keys and return the new document', async () => {
      const updated = { _id: sessionId, creds: {}, keys }
      AuthModel.findByIdAndUpdate.mockResolvedValue(updated)

      const result = await repo.updateKeys(sessionId, keys)

      expect(AuthModel.findByIdAndUpdate).toHaveBeenCalledWith(
        sessionId,
        { $set: { keys } },
        { new: true }
      )
      expect(result).toBe(updated)
    })
  })

  describe('remove', () => {
    it('should remove the document by id and return it', async () => {
      const removed = { _id: sessionId }
      AuthModel.findByIdAndDelete.mockResolvedValue(removed)

      const result = await repo.remove(sessionId)

      expect(AuthModel.findByIdAndDelete).toHaveBeenCalledWith(sessionId)
      expect(result).toBe(removed)
    })
  })
})
