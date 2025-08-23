import express from 'express'
import morgan from 'morgan'

import dbConnect from './config/db.js'
import routes from './routes/index.js'
import errorHandler from './middlewares/errorHandler.js'

const app = express()
app.use(express.json())

const connection = await dbConnect()

connection.on('error', (error) => console.error('DB Error', error))
connection.once('open', () => console.error('DB connect'))

app.use(morgan('tiny'))
app.use('/', routes)
app.use(errorHandler)

export default app
