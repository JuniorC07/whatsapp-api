import * as baileys from 'baileys'
import pino from 'pino'
import QRCode from 'qrcode'
import { useMongoAuthState } from '../utils/useMongoAuthState.js'
import { SocketError } from '../errors/index.js'

const DEFAULT_TIMEOUT = 5000
const { makeWASocket, fetchLatestBaileysVersion, DisconnectReason } = baileys

const sessions = new Map()

const initSocket = async (sessionId) => {
  const { state, saveCreds, clear } = await useMongoAuthState(sessionId)
  const { version } = await fetchLatestBaileysVersion()

  const sock = makeWASocket({
    logger: pino({ level: 'error' }),
    version,
    auth: state,
    printQRInTerminal: false,
    browser: ['Chrome (Linux)', 'Chrome', '120.0.0.0'],
  })

  let sessionData = {
    sock,
    status: 'pending',
    lastQR: null,
  }

  sessions.set(sessionId, sessionData)

  sock.ev.on('creds.update', saveCreds)

  sock.ev.on('connection.update', async ({ connection, qr, lastDisconnect }) => {
    if (qr) {
      sessionData.lastQR = await QRCode.toDataURL(qr, { width: 300, margin: 2 })
      sessionData.status = 'qr'
    }

    if (connection === 'open') {
      sessionData.status = 'connected'
      sessionData.lastQR = null
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode
      console.log(`[${sessionId}] Disconnected. Reason:`, statusCode, lastDisconnect?.error)

      sessionData.status = 'closed'
      sessionData.lastQR = null
      sessions.delete(sessionId)

      if (statusCode !== DisconnectReason.loggedOut) {
        // Retry because issue https://github.com/WhiskeySockets/Baileys/issues/107
        setTimeout(() => initSocket(sessionId), 1000)
      } else {
        await clear(sessionId)
        console.log(`[${sessionId}] Session expired, need to scan QR again.`)
      }
    }
  })

  return sock
}

export const getSocket = async (sessionId) => {
  const existing = sessions.get(sessionId)
  if (existing?.sock) return existing.sock

  console.log(`Starting new WhatsApp socket for session: ${sessionId}`)
  return initSocket(sessionId)
}

export const getQR = async (sessionId, timeoutMs = DEFAULT_TIMEOUT) => {
  const session = sessions.get(sessionId)
  if (!session) await getSocket(sessionId)

  const { status, lastQR, sock } = sessions.get(sessionId)

  if (status === 'connected') return 'connected'
  if (status === 'qr' && lastQR) return lastQR

  return new Promise((resolve, reject) => {
    const cleanup = () => clearTimeout(timer)
    const onUpdate = async ({ connection, qr }) => {
      if (connection === 'open') {
        cleanup()
        sock.ev.off('connection.update', onUpdate)
        resolve('connected')
      }
      if (qr) {
        cleanup()
        sock.ev.off('connection.update', onUpdate)
        const dataUrl = await QRCode.toDataURL(qr, { width: 300, margin: 2 })
        resolve(dataUrl)
      }
    }
    const timer = setTimeout(() => {
      sock.ev.off('connection.update', onUpdate)
      reject(new SocketError('Timeout waiting for QR Code'))
    }, timeoutMs)

    sock.ev.on('connection.update', onUpdate)
  })
}

const waitUntilConnected = async (sessionId, timeoutMs = DEFAULT_TIMEOUT) => {
  return new Promise((resolve, reject) => {
    const session = sessions.get(sessionId)
    if (!session) return reject(new SocketError('No session found'))
    if (session.status === 'connected') return resolve(true)
    const cleanup = () => {
      clearTimeout(timer)
      session.sock.ev.off('connection.update', onUpdate)
    }
    const onUpdate = ({ connection }) => {
      if (connection === 'open') {
        cleanup()
        resolve(true)
      }
      if (connection === 'close') {
        cleanup()
        reject(new SocketError('Connection closed before ready'))
      }
    }
    const timer = setTimeout(() => {
      cleanup()
      if (session.status === 'qr' && session.lastQR) {
        reject(new SocketError('QR not scanned — session not authenticated'))
      } else {
        reject(new SocketError('Timeout waiting for connection'))
      }
    }, timeoutMs)
    session.sock.ev.on('connection.update', onUpdate)
  })
}

export const sendMessage = async (sessionId, number, { text, imgPath = null }) => {
  const sock = await getSocket(sessionId)
  await waitUntilConnected(sessionId)
  const jid = number.includes('@s.whatsapp.net') ? number : `${number}@s.whatsapp.net`
  const msg = imgPath ? { image: { url: imgPath }, caption: text } : { text }
  return sock.sendMessage(jid, msg)
}
