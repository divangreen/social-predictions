import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { isAdmin } from '../admin'

describe('isAdmin', () => {
  const originalEnv = process.env.ADMIN_USER_IDS

  afterEach(() => {
    process.env.ADMIN_USER_IDS = originalEnv
  })

  it('returns true for a matching user ID', () => {
    process.env.ADMIN_USER_IDS = 'abc123,def456'
    expect(isAdmin('abc123')).toBe(true)
  })

  it('returns true for second admin in list', () => {
    process.env.ADMIN_USER_IDS = 'abc123,def456'
    expect(isAdmin('def456')).toBe(true)
  })

  it('returns false for unknown user', () => {
    process.env.ADMIN_USER_IDS = 'abc123'
    expect(isAdmin('unknown')).toBe(false)
  })

  it('returns false when ADMIN_USER_IDS is empty', () => {
    process.env.ADMIN_USER_IDS = ''
    expect(isAdmin('abc123')).toBe(false)
  })

  it('returns false when ADMIN_USER_IDS is undefined', () => {
    delete process.env.ADMIN_USER_IDS
    expect(isAdmin('abc123')).toBe(false)
  })

  it('trims whitespace around IDs', () => {
    process.env.ADMIN_USER_IDS = ' abc123 , def456 '
    expect(isAdmin('abc123')).toBe(true)
    expect(isAdmin('def456')).toBe(true)
  })

  it('is case-sensitive', () => {
    process.env.ADMIN_USER_IDS = 'ABC123'
    expect(isAdmin('abc123')).toBe(false)
    expect(isAdmin('ABC123')).toBe(true)
  })

  it('returns false for partial match', () => {
    process.env.ADMIN_USER_IDS = 'abc123'
    expect(isAdmin('abc')).toBe(false)
    expect(isAdmin('abc123extra')).toBe(false)
  })

  it('handles single admin correctly', () => {
    process.env.ADMIN_USER_IDS = 'solo-admin'
    expect(isAdmin('solo-admin')).toBe(true)
  })
})
