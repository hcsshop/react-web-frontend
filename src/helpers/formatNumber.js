import { formatPhoneNumber } from 'react-phone-number-input'

export const formatNumber = number => {
  if (!number) return false
  const formattedNumber = formatPhoneNumber(number)
  if (!formattedNumber || formattedNumber === '') return number
  return formattedNumber
}
