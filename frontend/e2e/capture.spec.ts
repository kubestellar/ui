import { test } from '@playwright/test';

test('capture aws banner', async ({ page }) => {
  console.log('Navigating to localhost:5174...');
  await page.goto('http://localhost:5174');
  
  // Wait for some time to ensure everything renders (animations etc)
  await page.waitForTimeout(3000);
  
  console.log('Taking screenshot...');
  await page.screenshot({ path: '/Users/zyzz_mohit/Documents/ui/aws_banner.png', fullPage: true });
});
