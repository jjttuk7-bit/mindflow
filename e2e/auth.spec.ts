import { test, expect } from "playwright/test"

test.describe("Authentication Flow", () => {
  test("should reject invalid credentials", async ({ page }) => {
    await page.goto("/login")
    await page.fill('input[type="email"]', "invalid@test.com")
    await page.fill('input[type="password"]', "wrongpassword")
    await page.locator('button[type="submit"]').click()

    // Should show error message
    await page.waitForTimeout(2000)
    const errorVisible = await page.locator("text=Invalid login").or(page.locator("text=잘못된")).or(page.locator('[role="alert"]')).isVisible().catch(() => false)
    expect(errorVisible).toBeTruthy()
  })

  test("should redirect unauthenticated user to login", async ({ page }) => {
    await page.goto("/settings")
    await page.waitForURL("**/login**", { timeout: 5000 })
    expect(page.url()).toContain("/login")
  })

  test("should protect API routes from unauthenticated access", async ({ request }) => {
    const res = await request.get("/api/items")
    expect(res.status()).toBe(401)
  })

  test("should protect todos API from unauthenticated access", async ({ request }) => {
    const res = await request.get("/api/todos")
    expect(res.status()).toBe(401)
  })
})
