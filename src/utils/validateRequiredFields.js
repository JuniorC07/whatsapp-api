import { MissingParamError } from '../errors/index.js'

const validateRequiredFields = (requiredFields = [], body = {}) => {
  for (const field of requiredFields) {
    if (!body[field]) {
      throw new MissingParamError(field)
    }
  }
}

export default validateRequiredFields
