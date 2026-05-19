/**
 * Integration tests for admin guard — verifies isAdmin works correctly
 * when ADMIN_USER_IDS is set via environment variable (as it would be in production).
 */
import { describe, it, expect, afterEach } from 'vitest'
import { isAdmin } from '../../admin'

const REAL_ADMIN = 'real-admin-uuid-1234'
const OTHER_USER = 'other-user-uuid-5678'

describe('isAdmin — environment integration', () => {
  afterEach(() => {
    delete process.env.ADMIN_USER_IDS
  })

  it('correctly grants access to configured admin', () => {
    process.env.ADMIN_USER_IDS = REAL_ADMIN
    expect(isAdmin(REAL_ADMIN)).toBe(true)
  })

  it('correctly denies access to non-admin', () => {
    process.env.ADMIN_USER_IDS = REAL_ADMIN
    expect(isAdmin(OTHER_USER)).toBe(false)
  })

  it('supports multiple admins separated by commas', () => {
    process.env.ADMIN_USER_IDS = `${REAL_ADMIN},${OTHER_USER}`
    expect(isAdmin(REAL_ADMIN)).toBe(true)
    expect(isAdmin(OTHER_USER)).toBe(true)
  })

  it('no admins when env var is not set', () => {
    expect(isAdmin(REAL_ADMIN)).toBe(false)
  })

  it('no admins when env var is blank', () => {
    process.env.ADMIN_USER_IDS = '   '
    expect(isAdmin(REAL_ADMIN)).toBe(false)
  })

  it('admin route protection — non-admin cannot access admin actions', () => {
    process.env.ADMIN_USER_IDS = REAL_ADMIN
    // Simulate middleware-level check
    const userId = OTHER_USER
    const canAccess = isAdmin(userId)
    expect(canAccess).toBe(false)
  })
})
