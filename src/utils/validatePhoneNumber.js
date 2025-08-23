import { InvalidPhoneNumberError } from '../errors/index.js'

export function validatePhoneNumber(number) {
  let isValid = true
  if (!/^\d+$/.test(number)) isValid = false
  if (number.length < 10 || number.length > 15) isValid = false
  if (!isValid) {
    throw new InvalidPhoneNumberError()
  }

  return true
}
