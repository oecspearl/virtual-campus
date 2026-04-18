import { describe, it, expect } from 'vitest'
import { sanitizeInput } from '../security'
import { isValidEmail, isValidHttpUrl } from '../validations'

const validateEmail = isValidEmail
const validateURL = isValidHttpUrl

describe('sanitizeInput', () => {
  it('trims whitespace from strings', () => {
    expect(sanitizeInput('  hello  ')).toBe('hello')
  })

  it('strips HTML angle brackets', () => {
    expect(sanitizeInput('<script>alert(1)</script>')).toBe('scriptalert(1)/script')
  })

  it('truncates strings over 1000 chars', () => {
    const long = 'a'.repeat(2000)
    expect(sanitizeInput(long).length).toBe(1000)
  })

  it('recursively sanitizes object values', () => {
    const result = sanitizeInput({ name: '  <b>test</b>  ', nested: { val: ' hi ' } })
    expect(result.name).toBe('btest/b')
    expect(result.nested.val).toBe('hi')
  })

  it('rejects keys longer than 50 chars', () => {
    const longKey = 'a'.repeat(51)
    const result = sanitizeInput({ [longKey]: 'value', short: 'ok' })
    expect(result[longKey]).toBeUndefined()
    expect(result.short).toBe('ok')
  })

  it('passes through numbers and booleans unchanged', () => {
    expect(sanitizeInput(42)).toBe(42)
    expect(sanitizeInput(true)).toBe(true)
    expect(sanitizeInput(null)).toBe(null)
  })
})

describe('validateEmail', () => {
  it('accepts valid emails', () => {
    expect(validateEmail('user@example.com')).toBe(true)
    expect(validateEmail('name.last@domain.co.uk')).toBe(true)
  })

  it('rejects invalid emails', () => {
    expect(validateEmail('')).toBe(false)
    expect(validateEmail('not-an-email')).toBe(false)
    expect(validateEmail('@no-user.com')).toBe(false)
    expect(validateEmail('user@')).toBe(false)
  })

  it('rejects emails over 254 characters', () => {
    const longEmail = 'a'.repeat(243) + '@example.com' // 255 chars total
    expect(validateEmail(longEmail)).toBe(false)
  })
})

describe('validateURL', () => {
  it('accepts http and https URLs', () => {
    expect(validateURL('https://example.com')).toBe(true)
    expect(validateURL('http://localhost:3000')).toBe(true)
    expect(validateURL('https://sub.domain.com/path?q=1')).toBe(true)
  })

  it('rejects non-http protocols', () => {
    expect(validateURL('ftp://files.example.com')).toBe(false)
    expect(validateURL('javascript:alert(1)')).toBe(false)
    expect(validateURL('data:text/html,<h1>hi</h1>')).toBe(false)
  })

  it('rejects invalid URLs', () => {
    expect(validateURL('')).toBe(false)
    expect(validateURL('not a url')).toBe(false)
  })
})
