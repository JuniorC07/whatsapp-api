import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import handleMethod from '../../../src/utils/handleMethod.js'
describe('[Unit][utils.handleMethod]', () => {
  let req, res, next

  beforeEach(() => {
    req = {}
    res = {}
    next = jest.fn()
  })

  it('should call the action with req, res, next when no error occurs', async () => {
    const action = jest.fn().mockResolvedValue('ok')
    const handler = handleMethod(action)

    await handler(req, res, next)

    expect(action).toHaveBeenCalledWith(req, res, next)
    expect(next).not.toHaveBeenCalled()
  })

  it('should call next with the error when action throws', async () => {
    const error = new Error('boom')
    const action = jest.fn().mockRejectedValue(error)
    const handler = handleMethod(action)

    await handler(req, res, next)

    expect(action).toHaveBeenCalledWith(req, res, next)
    expect(next).toHaveBeenCalledWith(error)
  })

  it('should propagate synchronous errors to next', async () => {
    const error = new Error('sync fail')
    const action = jest.fn(() => {
      throw error
    })
    const handler = handleMethod(action)

    await handler(req, res, next)

    expect(next).toHaveBeenCalledWith(error)
  })
})
