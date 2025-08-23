import { HttpError } from '../errors/index.js'

// eslint-disable-next-line no-unused-vars
const errorHandler = (error, _req, res, _next) => {
  let status = 500
  let message = 'Internal Server Error'
  console.log('Error Handler:', error)
  if (error instanceof HttpError) {
    status = error.statusCode
    message = error.message
  } else {
    console.error(error)
  }
  res.status(status).json({ message })
}

export default errorHandler
