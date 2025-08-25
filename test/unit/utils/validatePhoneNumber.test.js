import { describe, it, expect } from '@jest/globals'
import { validatePhoneNumber } from '../../../src/utils/validatePhoneNumber.js'
import { InvalidPhoneNumberError } from '../../../src/errors/index.js'

describe('[Unit][utils.validatePhoneNumber]', () => {
  it('should return true for a valid phone number (10 digits)', () => {
    const result = validatePhoneNumber('1234567890')
    expect(result).toBe(true)
  })

  it('should return true for a valid phone number (15 digits)', () => {
    const result = validatePhoneNumber('123456789012345')
    expect(result).toBe(true)
  })

  it('should throw InvalidPhoneNumberError when number contains non-digits', () => {
    expect(() => validatePhoneNumber('12345abcde')).toThrow(InvalidPhoneNumberError)
  })

  it('should throw InvalidPhoneNumberError when number is shorter than 10 digits', () => {
    expect(() => validatePhoneNumber('123456789')).toThrow(InvalidPhoneNumberError)
  })

  it('should throw InvalidPhoneNumberError when number is longer than 15 digits', () => {
    expect(() => validatePhoneNumber('1234567890123456')).toThrow(InvalidPhoneNumberError)
  })

  it('should throw InvalidPhoneNumberError when number is empty', () => {
    expect(() => validatePhoneNumber('')).toThrow(InvalidPhoneNumberError)
  })
})
