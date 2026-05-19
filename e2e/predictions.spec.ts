import { test, expect } from '@playwright/test'

/**
 * E2E: Prediction flows
 * NOTE: Tests that require auth use storageState set via globalSetup.
 * Unauthenticated tests run without setup.
 */

test.describe('Prediction UI — unauthenticated redirects', () => {

  test('redirects to login when accessing tournament without auth', async ({ page }) => {
    await page.goto('/tournaments')
    await expect(page).toHaveURL(/\/login/)
  })

})

test.describe('Share page — public (no auth required)', () => {

  test('renders share card with correct teams and score', async ({ page }) => {
    await page.goto('/share/prediction?home=Brazil&away=Argentina&hs=2&as=1&u=divan&pts=3&p=1')
    await expect(page.getByText('Brazil')).toBeVisible()
    await expect(page.getByText('Argentina')).toBeVisible()
    await expect(page.getByText('2')).toBeVisible()
    await expect(page.getByText('1')).toBeVisible()
  })

  test('shows perfect score label when p=1', async ({ page }) => {
    await page.goto('/share/prediction?home=Brazil&away=Argentina&hs=2&as=1&u=divan&pts=3&p=1')
    await expect(page.getByText(/Perfect score/i)).toBeVisible()
  })

  test('shows points when not perfect', async ({ page }) => {
    await page.goto('/share/prediction?home=Brazil&away=Argentina&hs=2&as=1&u=divan&pts=1')
    await expect(page.getByText(/1 pts/i)).toBeVisible()
  })

  test('shows missed label when pts=0', async ({ page }) => {
    await page.goto('/share/prediction?home=Brazil&away=Argentina&hs=2&as=1&u=divan&pts=0')
    await expect(page.getByText(/Missed/i)).toBeVisible()
  })

  test('shows username on share card', async ({ page }) => {
    await page.goto('/share/prediction?home=Brazil&away=Argentina&hs=2&as=1&u=testuser&pts=3')
    await expect(page.getByText(/testuser/i)).toBeVisible()
  })

  test('shows Join predictr CTA button', async ({ page }) => {
    await page.goto('/share/prediction?home=Brazil&away=Argentina&hs=2&as=1&u=divan&pts=3')
    await expect(page.getByText(/Join predictr/i)).toBeVisible()
  })

  test('renders on mobile viewport without overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/share/prediction?home=El+Salvador&away=Costa+Rica&hs=1&as=0&u=user&pts=1')
    const body = page.locator('body')
    const bodyWidth = await body.evaluate(el => el.scrollWidth)
    expect(bodyWidth).toBeLessThanOrEqual(375 + 10) // allow 10px tolerance
  })

  test('handles missing params gracefully', async ({ page }) => {
    await page.goto('/share/prediction')
    // Should render with fallback values, not crash
    await expect(page.locator('main')).toBeVisible()
  })

})

test.describe('Share page — OG metadata', () => {

  test('has og:title meta tag', async ({ page }) => {
    await page.goto('/share/prediction?home=Brazil&away=Argentina&hs=2&as=1&u=divan&pts=3&p=1')
    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content')
    expect(ogTitle).toBeTruthy()
    expect(ogTitle).toContain('Brazil')
  })

  test('has og:image meta tag pointing to /api/og', async ({ page }) => {
    await page.goto('/share/prediction?home=Brazil&away=Argentina&hs=2&as=1&u=divan&pts=3')
    const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content')
    expect(ogImage).toContain('/api/og')
  })

  test('has twitter:card meta tag', async ({ page }) => {
    await page.goto('/share/prediction?home=Brazil&away=Argentina&hs=2&as=1&u=divan&pts=3')
    const twitterCard = await page.locator('meta[name="twitter:card"]').getAttribute('content')
    expect(twitterCard).toBe('summary_large_image')
  })

})
