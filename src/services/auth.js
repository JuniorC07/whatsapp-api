import AuthModel from '../models/Auth.js'

const getOrCreate = async (sessionId, creds) => {
  let doc = await AuthModel.findById(sessionId)

  if (!doc) {
    doc = await AuthModel.create({
      _id: sessionId,
      creds,
      keys: {},
    })
  }

  return doc
}

const updateCreds = (sessionId, creds) => {
  return AuthModel.findByIdAndUpdate(sessionId, { $set: { creds } }, { new: true })
}

const updateKeys = (sessionId, keys) => {
  return AuthModel.findByIdAndUpdate(sessionId, { $set: { keys } }, { new: true })
}

const remove = (id) => {
  return AuthModel.findByIdAndDelete(id)
}

export default {
  getOrCreate,
  updateCreds,
  updateKeys,
  remove,
}
