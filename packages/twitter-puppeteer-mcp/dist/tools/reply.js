"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReplyTweetTool = void 0;
const sdk_1 = require("@modelcontextprotocol/sdk");
const browser_1 = require("../browser");
class ReplyTweetTool extends sdk_1.Tool {
    constructor(mcp) {
        super(mcp, {
            name: 'reply_tweet',
            description: 'Replies to a tweet.',
            input: {
                tweet_url: 'The URL of the tweet to reply to.',
                text: 'The text content of the reply.',
                typing_delay_ms: 'Optional delay between keystrokes in milliseconds.',
            },
        });
    }
    async run(input) {
        const browser = await (0, browser_1.launchBrowser)();
        try {
            const page = await (0, browser_1.preparePage)(browser);
            await page.goto(input.tweet_url, { waitUntil: 'networkidle2', timeout: 30000 });
            await page.waitForSelector('[data-testid="reply"]', { timeout: 15000 });
            await page.click('[data-testid="reply"]');
            await page.waitForSelector('[data-testid="tweetTextarea_0"]', { timeout: 15000 });
            await page.click('[data-testid="tweetTextarea_0"]');
            await page.keyboard.type(input.text, { delay: input.typing_delay_ms || 50 });
            await new Promise(r => setTimeout(r, 1000));
            await page.click('[data-testid="tweetButton"]');
            await new Promise(r => setTimeout(r, 3000));
            // It's harder to confirm a reply was successful, so we'll just assume it was if no error occurred.
            // A more robust solution could check for the new reply appearing in the thread.
            return { success: true };
        }
        catch (e) {
            if (browser) {
                const pages = await browser.pages();
                const page = pages.length > 0 ? pages[0] : undefined;
                if (page) {
                    const screenshotPath = await (0, browser_1.takeErrorScreenshot)(page, 'reply-tweet-exception');
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
exports.ReplyTweetTool = ReplyTweetTool;
