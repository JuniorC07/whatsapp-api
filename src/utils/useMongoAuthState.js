import { initAuthCreds, BufferJSON } from 'baileys'
import AuthService from '../services/auth.js'

export const useMongoAuthState = async (sessionId) => {
  let doc = await AuthService.getOrCreate(
    sessionId,
    JSON.parse(JSON.stringify(initAuthCreds(), BufferJSON.replacer))
  )

  let creds = JSON.parse(JSON.stringify(doc.creds), BufferJSON.reviver)
  let keys = JSON.parse(JSON.stringify(doc.keys || {}), BufferJSON.reviver)

  return {
    clear: async () => {
      await AuthService.remove(sessionId)
    },
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {}
          for (const id of ids) {
            const value = keys[type]?.[id]
            if (value) {
              data[id] = type === 'app-state-sync-key' ? BufferJSON.reviver('', value) : value
            }
          }
          return data
        },
        set: async (data) => {
          for (const type of Object.keys(data)) {
            if (!keys[type]) keys[type] = {}
            Object.assign(keys[type], data[type])
          }
          await AuthService.updateKeys(
            sessionId,
            JSON.parse(JSON.stringify(keys, BufferJSON.replacer))
          )
        },
      },
    },
    saveCreds: async () => {
      await AuthService.updateCreds(
        sessionId,
        JSON.parse(JSON.stringify(creds, BufferJSON.replacer))
      )
    },
  }
}
