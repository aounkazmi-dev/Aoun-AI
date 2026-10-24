// Explicit opt-in: uses configured provider keys and makes one paid chat request.
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';

if (!process.argv.includes('--live')) throw new Error('Pass --live to authorize the one-request smoke test.');
const python = resolve(process.platform === 'win32' ? '../.venv/Scripts/python.exe' : '../.venv/bin/python');
const server = spawn(python, ['-m', 'uvicorn', 'backend.api:app', '--host', '127.0.0.1', '--port', '8002', '--no-proxy-headers'], {
  cwd: '..', env: { ...process.env, DEMO_MODE: 'false' }, stdio: 'ignore', windowsHide: true,
});
let browser;
try {
  let ready = false;
  for (let i = 0; i < 30; i++) {
    try { ready = (await fetch('http://127.0.0.1:8002/api/ready')).ok; } catch {}
    if (ready) break;
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  if (!ready) throw new Error('Live backend is not ready.');
  browser = await chromium.launch({ channel: process.platform === 'win32' ? 'chrome' : undefined });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:8002');
  await page.getByText('AI assistant', { exact: true }).waitFor();
  await page.getByRole('textbox', { name: 'Message AounOS' }).fill('Is ScamShield PK already implemented?');
  const started = Date.now();
  await page.getByRole('button', { name: 'Send message' }).click();
  await page.getByRole('button', { name: 'Retry', exact: true }).waitFor({ timeout: 90000 });
  if (await page.locator('.interrupted').count()) throw new Error('Live response was interrupted.');
  const answer = await page.locator('.message.assistant .markdown').innerText();
  if (!/planned|concept|not.*implemented/i.test(answer)) throw new Error('Live answer did not preserve planned project status.');
  await page.getByRole('button', { name: /reference sources/ }).click();
  await page.getByRole('dialog', { name: 'Reference sources' }).waitFor();
  await page.getByRole('button', { name: 'Close sources' }).click();
  await page.screenshot({ path: '../docs/screenshots/live-chat.png', fullPage: true, animations: 'disabled' });
  if (errors.length) throw new Error('Browser reported a runtime error.');
  console.log(JSON.stringify({ live: true, completed: true, sourcesVerified: true, elapsedMs: Date.now() - started }));
} finally {
  if (browser) await browser.close();
  server.kill();
}
