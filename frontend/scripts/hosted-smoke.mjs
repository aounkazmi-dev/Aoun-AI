// Explicit live opt-in: one provider-backed question against the deployed app.
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

if (!process.argv.includes('--live')) throw new Error('Pass --live for the paid provider smoke check.');
const site = process.env.FRONTEND_URL || 'https://aoun-abbas-ai.vercel.app';
const api = process.env.API_BASE_URL || 'https://aounos-api.onrender.com';
const ready = await fetch(`${api}/api/ready`, { signal: AbortSignal.timeout(120000) });
assert.equal(ready.status, 200, 'Backend must be ready');
assert.equal((await ready.json()).mode, 'live');

const browser = await chromium.launch({ channel: process.platform === 'win32' ? 'chrome' : undefined });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(site);
  await page.getByText('AI assistant', { exact: true }).waitFor({ timeout: 120000 });
  const received = page.waitForResponse(r => r.url() === `${api}/api/chat` && r.request().method() === 'POST');
  await page.getByRole('textbox', { name: 'Message AounOS' }).fill('Is ScamShield PK already implemented?');
  const started = Date.now();
  await page.getByRole('button', { name: 'Send message' }).click();
  const response = await received;
  assert.equal(response.status(), 200);
  assert.equal(response.headers()['access-control-allow-origin'], new URL(site).origin);
  assert.match(response.headers()['content-type'], /text\/event-stream/);
  await page.getByRole('button', { name: 'Retry', exact: true }).waitFor({ timeout: 120000 });
  assert.equal(await page.locator('.interrupted').count(), 0);
  const answer = await page.locator('.message.assistant .markdown').innerText();
  assert.match(answer, /planned|concept|not.*implemented/i);
  const wire = await response.text();
  assert.match(wire, /event: token/);
  assert.match(wire, /event: done/);
  assert.doesNotMatch(wire, /event: error/);
  const done = JSON.parse(wire.split('event: done\n')[1].split('\n')[0].replace(/^data: /, ''));
  await page.getByRole('button', { name: /reference sources/ }).click();
  await page.getByRole('dialog', { name: 'Reference sources' }).waitFor();
  await page.getByRole('button', { name: 'Close sources' }).click();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({ path: '../docs/screenshots/deployed-mobile-chat.png', animations: 'disabled' });
  await page.getByRole('button', { name: 'Open navigation' }).click();
  const download = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Download Aoun’s resume', exact: true }).click();
  assert.equal((await download).suggestedFilename(), 'Aoun_Abbas_Resume.pdf');
  await page.reload();
  await page.getByRole('button', { name: 'Open navigation' }).click();
  await page.locator('.history-title').first().click();
  assert.equal(await page.locator('.message.assistant .markdown').innerText(), answer);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: '../docs/screenshots/deployed-desktop-chat.png', animations: 'disabled' });
  assert.equal(errors.length, 0);
  console.log(JSON.stringify({ site, api, live: true, provider: done.provider, elapsedMs: Date.now() - started,
    streaming: true, cors: true, sources: true, resumeDownload: true, historyRestored: true, pageErrors: errors.length }));
} finally {
  await browser.close();
}
