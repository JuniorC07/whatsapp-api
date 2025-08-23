import { Router } from 'express'
import whatsappController from '../controllers/whatsapp.js'
import handleMethod from '../utils/handleMethod.js'
import { upload } from '../middlewares/uploadHandler.js'

const whatsappRouter = Router()

whatsappRouter.get('/qr', handleMethod(whatsappController.getQRCode))
whatsappRouter.post('/messages', upload.single('image'), handleMethod(whatsappController.send))

export default whatsappRouter
