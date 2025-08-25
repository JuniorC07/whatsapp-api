import { describe, it, expect } from '@jest/globals'
import { InvalidFieldError } from '@/errors/index.js'
import { upload } from '@/middlewares/uploadHandler.js'

const { fileFilter } = upload

describe('[Unit][middlwares.uploadHandler]', () => {
  it('should accept valid image/jpeg file', () => {
    const file = { mimetype: 'image/jpeg' }
    fileFilter({}, file, (err, accept) => {
      expect(err).toBeNull()
      expect(accept).toBe(true)
    })
  })

  it('should accept valid image/png file', () => {
    const file = { mimetype: 'image/png' }
    fileFilter({}, file, (err, accept) => {
      expect(err).toBeNull()
      expect(accept).toBe(true)
    })
  })

  it('should reject invalid file type (application/pdf)', () => {
    const file = { mimetype: 'application/pdf' }

    fileFilter({}, file, (err, accept) => {
      expect(err).toBeInstanceOf(InvalidFieldError)
      expect(err.statusCode).toBe(422)
      expect(err.message).toBe('You must provide a valid uploaded image')
      expect(accept).toBe(false)
    })
  })

  it('should have a file size limit of 16MB', () => {
    expect(upload.limits.fileSize).toBe(16 * 1024 * 1024)
  })
})
