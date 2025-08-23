import mongoose from 'mongoose'

const AuthSchema = new mongoose.Schema(
  {
    id: { type: mongoose.Schema.Types.ObjectId },
    creds: { type: mongoose.Schema.Types.Mixed, required: true },
    keys: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
)

export const AuthModel = mongoose.model('Auth', AuthSchema)

export default AuthModel
