"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.QuoteTweetTool = void 0;
const sdk_1 = require("@modelcontextprotocol/sdk");
const browser_1 = require("../browser");
class QuoteTweetTool extends sdk_1.Tool {
    constructor(mcp) {
        super(mcp, {
            name: 'quote_tweet',
            description: 'Quotes a tweet.',
            input: {
                tweet_url: 'The URL of the tweet to quote.',
                text: 'The text content of the quote tweet.',
                typing_delay_ms: 'Optional delay between keystrokes in milliseconds.',
            },
        });
    }
    async run(input) {
        const browser = await (0, browser_1.launchBrowser)();
        try {
            const page = await (0, browser_1.preparePage)(browser);
            await page.goto(input.tweet_url, { waitUntil: 'networkidle2', timeout: 30000 });
            // Click the "Repost" button
            await page.waitForSelector('[data-testid="repost"]', { timeout: 15000 });
            await page.click('[data-testid="repost"]');
            // Click the "Quote" option from the menu
            await page.waitForSelector('a[href="/compose/tweet"]', { timeout: 15000 });
            await page.click('a[href="/compose/tweet"]');
            await page.waitForSelector('[data-testid="tweetTextarea_0"]', { timeout: 15000 });
            await page.click('[data-testid="tweetTextarea_0"]');
            await page.keyboard.type(input.text, { delay: input.typing_delay_ms || 50 });
            await new Promise(r => setTimeout(r, 1000));
            await page.click('[data-testid="tweetButton"]');
            await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
            const currentUrl = page.url();
            if (currentUrl.includes('/status/')) {
                return { success: true, tweet_url: currentUrl };
            }
            else {
                const screenshotPath = await (0, browser_1.takeErrorScreenshot)(page, 'quote-tweet-error');
                return { success: false, error: 'Failed to quote tweet.', screenshot_path: screenshotPath };
            }
        }
        catch (e) {
            if (browser) {
                const pages = await browser.pages();
                const page = pages.length > 0 ? pages[0] : undefined;
                if (page) {
                    const screenshotPath = await (0, browser_1.takeErrorScreenshot)(page, 'quote-tweet-exception');
                    return { success: false, error: e.message, screenshot_path: screenshotPath };
                }
            }
            return { success: false, error: e.message };
        }
        finally {
            await browser.close();
        }
    }
}
exports.QuoteTweetTool = QuoteTweetTool;
