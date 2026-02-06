import puppeteer, { Browser, Page } from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

export interface BrowserResult {
  success: boolean;
  tweet_url?: string;
  error?: string;
  screenshot_path?: string;
}

export async function launchBrowser() {
  const chromiumPath = process.env.CHROMIUM_PATH;
  if (!chromiumPath) {
    throw new Error('CHROMIUM_PATH environment variable is not set.');
  }

  return puppeteer.launch({
    executablePath: chromiumPath,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-blink-features=AutomationControlled',
      '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    ],
  });
}

export async function preparePage(browser: Browser) {
  const authToken = process.env.AUTH_TOKEN;
  const ct0 = process.env.CT0;

  if (!authToken || !ct0) {
    throw new Error('Missing AUTH_TOKEN or CT0 environment variables');
  }

  const cookies = [
    { name: 'auth_token', value: authToken, domain: '.x.com', path: '/', httpOnly: true, secure: true, sameSite: 'None' as const },
    { name: 'ct0', value: ct0, domain: '.x.com', path: '/', httpOnly: false, secure: true, sameSite: 'Lax' as const },
  ];

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
  });

  await page.setCookie(...cookies);
  return page;
}

export async function takeErrorScreenshot(page: Page, baseFilename: string): Promise<string> {
    const screenshotDir = path.join(process.cwd(), 'screenshots');
    if (!fs.existsSync(screenshotDir)) {
        fs.mkdirSync(screenshotDir);
    }
    const screenshotPath = path.join(screenshotDir, `${baseFilename}-${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath });
    return screenshotPath;
}
