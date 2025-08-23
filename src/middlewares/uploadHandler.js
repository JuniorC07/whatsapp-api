import multer from 'multer'
import { storage } from '../config/multer.js'
import { InvalidFieldError } from '../errors/index.js'

function fileFilter(req, file, cb) {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  if (allowed.includes(file.mimetype)) {
    cb(null, true)
  } else {
    cb(new InvalidFieldError({ field: 'image', context: 'uploaded' }), false)
  }
}

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 16 * 1024 * 1024 },
})
