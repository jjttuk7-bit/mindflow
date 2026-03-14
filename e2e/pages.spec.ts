import { test, expect } from "playwright/test"

test.describe("Public Pages", () => {
  test("should load landing page without errors", async ({ page }) => {
    const errors: string[] = []
    page.on("pageerror", (err) => errors.push(err.message))

    await page.goto("/")
    await page.waitForLoadState("networkidle")

    expect(errors).toHaveLength(0)
  })

  test("should load login page without errors", async ({ page }) => {
    const errors: string[] = []
    page.on("pageerror", (err) => errors.push(err.message))

    await page.goto("/login")
    await page.waitForLoadState("networkidle")

    expect(errors).toHaveLength(0)
  })

  test("should load terms page", async ({ page }) => {
    await page.goto("/terms")
    await expect(page.locator("text=이용약관").or(page.locator("text=Terms"))).toBeVisible()
  })

  test("should load privacy page", async ({ page }) => {
    await page.goto("/privacy")
    await expect(page.locator("text=개인정보").or(page.locator("text=Privacy"))).toBeVisible()
  })

  test("should serve manifest.webmanifest", async ({ request }) => {
    const res = await request.get("/manifest.webmanifest")
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body.name).toBeTruthy()
    expect(body.start_url).toBeTruthy()
    expect(body.display).toBe("standalone")
  })

  test("should serve service worker", async ({ request }) => {
    const res = await request.get("/sw.js")
    expect(res.status()).toBe(200)
    const contentType = res.headers()["content-type"]
    expect(contentType).toContain("javascript")
  })
})

test.describe("SEO & Meta", () => {
  test("should have proper meta tags on landing", async ({ page }) => {
    await page.goto("/")
    const title = await page.title()
    expect(title).toBeTruthy()
    expect(title.length).toBeGreaterThan(0)

    const description = await page.locator('meta[name="description"]').getAttribute("content")
    expect(description).toBeTruthy()
  })

  test("should have viewport meta tag", async ({ page }) => {
    await page.goto("/")
    const viewport = await page.locator('meta[name="viewport"]').getAttribute("content")
    expect(viewport).toContain("width=device-width")
  })

  test("should have theme-color meta tag", async ({ page }) => {
    await page.goto("/")
    const themeColor = await page.locator('meta[name="theme-color"]').getAttribute("content")
    expect(themeColor).toBeTruthy()
  })
})

test.describe("API Health", () => {
  test("should return 401 for protected endpoints without auth", async ({ request }) => {
    const endpoints = ["/api/items", "/api/todos", "/api/chat"]
    for (const endpoint of endpoints) {
      const res = await request.get(endpoint).catch(() => null)
      if (res) {
        expect([401, 405]).toContain(res.status())
      }
    }
  })
})
