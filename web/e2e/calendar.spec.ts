import { test, expect } from '@playwright/test'

test('미인증 상태에서 캘린더 접근 시 로그인 리다이렉트', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/login/)
})
