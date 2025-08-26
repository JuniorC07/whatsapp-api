import { jest, describe, it, expect, beforeEach } from '@jest/globals'

await jest.unstable_mockModule('@/socket/whatsapp.js', () => ({
  getQR: jest.fn(),
  sendMessage: jest.fn(),
}))

await jest.unstable_mockModule('@/utils/validateRequiredFields.js', () => ({
  __esModule: true,
  default: jest.fn(),
}))

await jest.unstable_mockModule('@/utils/validatePhoneNumber.js', () => ({
  validatePhoneNumber: jest.fn(),
}))

const { default: controller } = await import('@/controllers/whatsapp.js')
const { getQR, sendMessage } = await import('@/socket/whatsapp.js')
const validateRequiredFields = (await import('@/utils/validateRequiredFields.js')).default
const { validatePhoneNumber } = await import('@/utils/validatePhoneNumber.js')

describe('[Unit][controllers.whatsapp]', () => {
  let req, res

  beforeEach(() => {
    req = { body: {}, file: null }
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      send: jest.fn(),
      setHeader: jest.fn(),
    }
    jest.clearAllMocks()
  })

  describe('getQRCode', () => {
    it('should return a QR code as PNG buffer', async () => {
      getQR.mockResolvedValue('data:image/png;base64,ZmFrZUJhc2U2NA==')

      await controller.getQRCode(req, res)

      expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'image/png')
      expect(res.send).toHaveBeenCalledWith(expect.any(Buffer))
    })

    it('should return status if not QR', async () => {
      getQR.mockResolvedValue('connected')

      await controller.getQRCode(req, res)

      expect(res.status).toHaveBeenCalledWith(200)
      expect(res.json).toHaveBeenCalledWith({ status: 'connected' })
    })
  })

  describe('send', () => {
    it('should send a message successfully', async () => {
      req.body = { text: 'Hello', phoneNumber: '554999999999' }
      validateRequiredFields.mockImplementation(() => true)
      validatePhoneNumber.mockImplementation(() => true)
      sendMessage.mockResolvedValue({})

      await controller.send(req, res)

      expect(validateRequiredFields).toHaveBeenCalledWith(['text', 'phoneNumber'], req.body)
      expect(validatePhoneNumber).toHaveBeenCalledWith('554999999999')
      expect(sendMessage).toHaveBeenCalledWith(expect.any(String), '554999999999', {
        text: 'Hello',
        imgPath: undefined,
      })
      expect(res.status).toHaveBeenCalledWith(201)
      expect(res.json).toHaveBeenCalledWith({ message: 'message sent successfully' })
    })
  })
})
