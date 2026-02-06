"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.launchBrowser = launchBrowser;
exports.preparePage = preparePage;
exports.takeErrorScreenshot = takeErrorScreenshot;
const puppeteer_core_1 = __importDefault(require("puppeteer-core"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
async function launchBrowser() {
    const chromiumPath = process.env.CHROMIUM_PATH;
    if (!chromiumPath) {
        throw new Error('CHROMIUM_PATH environment variable is not set.');
    }
    return puppeteer_core_1.default.launch({
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
async function preparePage(browser) {
    const authToken = process.env.AUTH_TOKEN;
    const ct0 = process.env.CT0;
    if (!authToken || !ct0) {
        throw new Error('Missing AUTH_TOKEN or CT0 environment variables');
    }
    const cookies = [
        { name: 'auth_token', value: authToken, domain: '.x.com', path: '/', httpOnly: true, secure: true, sameSite: 'None' },
        { name: 'ct0', value: ct0, domain: '.x.com', path: '/', httpOnly: false, secure: true, sameSite: 'Lax' },
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
async function takeErrorScreenshot(page, baseFilename) {
    const screenshotDir = path_1.default.join(process.cwd(), 'screenshots');
    if (!fs_1.default.existsSync(screenshotDir)) {
        fs_1.default.mkdirSync(screenshotDir);
    }
    const screenshotPath = path_1.default.join(screenshotDir, `${baseFilename}-${Date.now()}.png`);
    await page.screenshot({ path: screenshotPath });
    return screenshotPath;
}
