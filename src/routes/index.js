import { Router } from 'express'
import { serve, setup } from 'swagger-ui-express'

import whatsappRouter from './whatsapp.js'
import { readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import notFoundHandler from '../middlewares/notFoundHandler.js'

const __filename = fileURLToPath(import.meta.url)
const docFile = readFileSync(path.resolve(path.dirname(__filename), '../docs/swagger-output.json'))
const routes = Router()

routes.use('/whatsapp', whatsappRouter)

routes.use('/docs', serve)
routes.get('/docs', setup(JSON.parse(docFile), { jsonEditor: true }))
routes.get('/', (req, res) => {
  res.sendStatus(200).json({
    name: 'Whatsapp - API',
  })
})
routes.get('/healthz', (req, res) => {
  res.sendStatus(200)
})

routes.use(notFoundHandler)

export default routes
