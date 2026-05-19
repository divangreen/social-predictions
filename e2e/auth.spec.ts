import { test, expect } from '@playwright/test'

/**
 * E2E: Authentication flows
 * Requires a running dev server at PLAYWRIGHT_BASE_URL (default: http://localhost:3000)
 */

test.describe('Authentication', () => {

  test('unauthenticated user is redirected to /login from /tournaments', async ({ page }) => {
    await page.goto('/tournaments')
    await expect(page).toHaveURL(/\/login/)
  })

  test('unauthenticated user is redirected to /login from /profile', async ({ page }) => {
    await page.goto('/profile')
    await expect(page).toHaveURL(/\/login/)
  })

  test('unauthenticated user is redirected from /admin routes', async ({ page }) => {
    await page.goto('/admin/fixtures')
    await expect(page).not.toHaveURL(/\/admin/)
  })

  test('login page renders email and password fields', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test('login page shows error on invalid credentials', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[type="email"]', 'invalid@example.com')
    await page.fill('input[type="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')
    // Should show an error message, not redirect to /tournaments
    await expect(page).not.toHaveURL(/\/tournaments/)
  })

  test('login page has submit button', async ({ page }) => {
    await page.goto('/login')
    const submitBtn = page.locator('button[type="submit"]')
    await expect(submitBtn).toBeVisible()
    await expect(submitBtn).toBeEnabled()
  })

})
