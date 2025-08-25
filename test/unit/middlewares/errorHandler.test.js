import { jest, describe, it, expect, beforeEach, beforeAll, afterAll } from '@jest/globals'
import errorHandler from '@/middlewares/errorHandler.js'
import { HttpError } from '@/errors/index.js'

describe('[Unit][middlwares.errorHandler]', () => {
  let req, res, next
  let logSpy, errorSpy

  beforeAll(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterAll(() => {
    logSpy.mockRestore()
    errorSpy.mockRestore()
  })

  beforeEach(() => {
    req = {}
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    }
    next = jest.fn()
    jest.clearAllMocks()
  })

  it('should handle HttpError and return its status/message', () => {
    const error = new HttpError({ statusCode: 422, message: 'Invalid input' })
    errorHandler(error, req, res, next)
    expect(res.status).toHaveBeenCalledWith(422)
    expect(res.json).toHaveBeenCalledWith({ message: 'Invalid input' })
  })

  it('should handle generic Error and return 500', () => {
    const error = new Error('Unexpected failure')
    errorHandler(error, req, res, next)
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ message: 'Internal Server Error' })
  })

  it('should handle non-HttpError object with statusCode property', () => {
    const error = { statusCode: 404, message: 'Not Found' }
    errorHandler(error, req, res, next)
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({ message: 'Internal Server Error' })
  })
})
