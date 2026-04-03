import { test, expect } from '@playwright/test'

test('미인증 사용자는 로그인 페이지로 리다이렉트된다', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveURL(/\/login/)
})

test('로그인 페이지에 Google 로그인 버튼이 표시된다', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('button', { name: /Google/ })).toBeVisible()
})

test('로그인 페이지에 Apple 로그인 버튼이 표시된다', async ({ page }) => {
  await page.goto('/login')
  await expect(page.getByRole('button', { name: /Apple/ })).toBeVisible()
})
