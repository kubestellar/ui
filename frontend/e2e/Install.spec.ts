import { test } from '@playwright/test';

test('install', async ({ page }) => {
  await page.goto('http://localhost:5173/install');
  await page.getByRole('button', { name: 'Retry Connection' }).click();
  await page.getByRole('heading', { name: 'Welcome to KubeStellar' }).click();
  await page.getByText('Get started with KubeStellar').click();
  await page.getByRole('button', { name: 'Next: Installation' }).click();
  await page.getByRole('button', { name: 'k3d' }).click();
  await page.getByRole('button', { name: 'Start Installation' }).click();
  await page.getByText('Follow the CLI installation').click();
});
