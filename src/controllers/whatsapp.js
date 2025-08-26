import validateRequiredFields from '../utils/validateRequiredFields.js'
import { getQR, sendMessage } from '../socket/whatsapp.js'
import { validatePhoneNumber } from '../utils/validatePhoneNumber.js'

const USER_ID = '68a892dcc881b0bf55dd1214' //Simulate a user ID, replace with actual user ID
const getQRCode = async (req, res) => {
  const result = await getQR(USER_ID)
  if (typeof result === 'string' && result.startsWith('data:image')) {
    const base64 = result.split(',')[1]
    const buf = Buffer.from(base64, 'base64')

    res.setHeader('Content-Type', 'image/png')
    res.setHeader('Content-Length', buf.length)
    return res.send(buf)
  }

  return res.status(200).json({ status: result })
}

const send = async (req, res) => {
  const requiredFields = ['text', 'phoneNumber']
  const { text, phoneNumber } = req.body
  validateRequiredFields(requiredFields, req.body)
  validatePhoneNumber(phoneNumber)

  await sendMessage(USER_ID, phoneNumber, {
    text,
    imgPath: req.file?.path,
  })
  res.status(201).json({ message: 'message sent successfully' })
}

export default {
  getQRCode,
  send,
}
