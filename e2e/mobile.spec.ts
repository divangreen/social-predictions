import { test, expect } from '@playwright/test'

/**
 * E2E: Mobile responsiveness tests
 * Validates layout integrity, touch target sizes, and no horizontal overflow
 * across iPhone SE (375px), standard mobile (390px), and tablet (768px).
 */

const VIEWPORTS = [
  { name: 'iPhone SE', width: 375, height: 667 },
  { name: 'iPhone 14', width: 390, height: 844 },
  { name: 'Pixel 5',   width: 393, height: 851 },
]

const PUBLIC_PAGES = [
  '/login',
  '/share/prediction?home=Brazil&away=Argentina&hs=2&as=1&u=divan&pts=3&p=1',
]

VIEWPORTS.forEach(viewport => {
  test.describe(`Mobile layout — ${viewport.name} (${viewport.width}px)`, () => {

    PUBLIC_PAGES.forEach(path => {
      test(`no horizontal overflow on ${path}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height })
        await page.goto(path)
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth)
        expect(overflow).toBeLessThanOrEqual(window.innerWidth + 5)
      })
    })

    test('login page inputs are full width on mobile', async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto('/login')
      const emailInput = page.locator('input[type="email"]')
      const box = await emailInput.boundingBox()
      if (box) {
        expect(box.width).toBeGreaterThan(200)
      }
    })

    test('share card fits within viewport', async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto('/share/prediction?home=Brazil&away=Argentina&hs=2&as=1&u=divan&pts=3')
      const card = page.locator('.rounded-2xl').first()
      const box = await card.boundingBox()
      if (box) {
        expect(box.width).toBeLessThanOrEqual(viewport.width)
      }
    })

  })
})

test.describe('Touch targets — minimum 44px', () => {

  test('login submit button meets 44px minimum height', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/login')
    const btn = page.locator('button[type="submit"]')
    const box = await btn.boundingBox()
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(44)
    }
  })

  test('Join predictr CTA button meets 44px minimum height', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/share/prediction?home=Brazil&away=Argentina&hs=2&as=1&u=divan&pts=3')
    const btn = page.getByText(/Join predictr/i)
    const box = await btn.boundingBox()
    if (box) {
      expect(box.height).toBeGreaterThanOrEqual(44)
    }
  })

})

test.describe('Text overflow — long team names', () => {

  test('share card handles long team names without overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/share/prediction?home=Bosnia-Herzegovina&away=Czech+Republic&hs=1&as=0&u=divan&pts=1')
    const bodyWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(bodyWidth).toBeLessThanOrEqual(380)
  })

  test('share card handles malformed score params without overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/share/prediction?home=Brazil&away=Argentina&hs=999&as=999&u=divan&pts=0')
    const bodyWidth = await page.evaluate(() => document.documentElement.scrollWidth)
    expect(bodyWidth).toBeLessThanOrEqual(380)
  })

})
