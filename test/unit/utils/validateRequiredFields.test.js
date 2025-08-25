import { describe, it, expect } from '@jest/globals'
import validateRequiredFields from '../../../src/utils/validateRequiredFields.js'
import { MissingParamError } from '../../../src/errors/index.js'

describe('[Unit][utils.validateRequiredFields]', () => {
  it('should not throw when all required fields are present in body', () => {
    const required = ['name', 'email']
    const body = { name: 'Junior', email: 'jr@example.com' }

    expect(() => validateRequiredFields(required, body)).not.toThrow()
  })

  it('should throw MissingParamError when a required field is missing', () => {
    const required = ['name', 'email']
    const body = { name: 'Junior' }

    expect(() => validateRequiredFields(required, body)).toThrow(MissingParamError)

    try {
      validateRequiredFields(required, body)
    } catch (err) {
      expect(err).toBeInstanceOf(MissingParamError)
      expect(err.statusCode).toBe(422)
      expect(err.message).toBe('Missing param: email')
    }
  })

  it('should throw MissingParamError for the first missing field encountered', () => {
    const required = ['name', 'email', 'phone']
    const body = {}

    expect(() => validateRequiredFields(required, body)).toThrow(MissingParamError)

    try {
      validateRequiredFields(required, body)
    } catch (err) {
      expect(err.message).toBe('Missing param: name')
    }
  })

  it('should not throw when requiredFields is empty', () => {
    const body = { anything: 'value' }

    expect(() => validateRequiredFields([], body)).not.toThrow()
  })

  it('should treat falsy values (null, undefined, empty string) as missing', () => {
    const required = ['name', 'email', 'phone']
    const body = { name: '', email: null, phone: undefined }

    for (const field of required) {
      expect(() => validateRequiredFields([field], body)).toThrow(MissingParamError)
    }
  })
})
