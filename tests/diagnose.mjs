import { chromium } from '@playwright/test';

async function diagnose() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.goto('http://localhost:3001', { waitUntil: 'load' });
  await page.waitForTimeout(2000);

  const html = await page.evaluate(() => document.body.innerHTML);
  console.log('BODY HTML length:', html.length);
  console.log('BODY snippet:', html.slice(0, 500));
  await browser.close();
}

diagnose();
