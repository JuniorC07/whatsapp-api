import mongoose from 'mongoose'

const dbConnect = async () => {
  mongoose.connect(process.env.DB_STRING_CONNECTION, { dbName: process.env.DB_DATABASE })
  if (process.env.DB_LOG == 'true') mongoose.set('debug', true)

  return mongoose.connection
}

export default dbConnect
