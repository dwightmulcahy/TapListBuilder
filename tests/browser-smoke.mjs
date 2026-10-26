import { chromium } from 'playwright';
import assert from 'node:assert/strict';

const browser = await chromium.launch({headless: true, args: ['--no-sandbox']});
const page = await browser.newPage({viewport: {width: 1440, height: 900}});
try {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const response = await page.goto(process.env.BASE_URL || 'http://localhost:18081', {waitUntil: 'networkidle'});
  assert.equal(response.status(), 200);
  await page.locator('#page').waitFor();
  await page.locator('#editor').waitFor();
  assert.ok((await page.locator('#tapList').innerText()).length > 0, 'Menu should render');
  await page.getByRole('button', {name: /Add item/i}).first().click();
  assert.ok(await page.locator('#editor').locator('input').count() > 0);
  await page.getByRole('button', {name: /4×6 Card/i}).click();
  assert.ok(await page.locator('#page').isVisible());
  await page.emulateMedia({media: 'print'});
  assert.ok(await page.locator('#page').isVisible());
  assert.deepEqual(errors, [], 'Browser should not throw errors');
} finally {
  await browser.close();
}
