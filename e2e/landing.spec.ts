import { test, expect } from "playwright/test"

test.describe("Landing Page", () => {
  test("should display hero section with slogan", async ({ page }) => {
    await page.goto("/")
    await expect(page.locator("text=기록은 내가")).toBeVisible()
  })

  test("should have login link", async ({ page }) => {
    await page.goto("/")
    const loginLink = page.locator('a[href="/login"], button:has-text("로그인"), a:has-text("로그인"), a:has-text("시작하기")')
    await expect(loginLink.first()).toBeVisible()
  })

  test("should navigate to login page", async ({ page }) => {
    await page.goto("/login")
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
  })

  test("should show social login buttons", async ({ page }) => {
    await page.goto("/login")
    await expect(page.locator("text=Google")).toBeVisible()
    await expect(page.locator("text=Kakao")).toBeVisible()
  })

  test("should toggle between login and signup", async ({ page }) => {
    await page.goto("/login")
    const toggleButton = page.locator("text=회원가입")
    await toggleButton.click()
    await expect(page.locator("text=로그인으로 돌아가기").or(page.locator("text=이미 계정이 있으신가요"))).toBeVisible()
  })

  test("should show validation error for empty login", async ({ page }) => {
    await page.goto("/login")
    const submitButton = page.locator('button[type="submit"]')
    await submitButton.click()
    // Browser validation or custom error should appear
    const emailInput = page.locator('input[type="email"]')
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid)
    expect(isInvalid).toBe(true)
  })
})
