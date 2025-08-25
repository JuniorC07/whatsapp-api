import { describe, it, expect } from '@jest/globals'
import notFoundHandler from '@/middlewares/notFoundHandler.js'
import { NotFoundError } from '@/errors/index.js'

describe('[Unit][middlwares.notFoundHandler]', () => {
  it('should throw a NotFoundError when invoked', () => {
    expect(() => notFoundHandler()).toThrow(NotFoundError)
  })

  it('should throw a NotFoundError with correct context', () => {
    try {
      notFoundHandler()
    } catch (error) {
      expect(error).toBeInstanceOf(NotFoundError)
      expect(error.context).toBe('resource')
      expect(error.message).toBe('resource not found')
    }
  })
})
