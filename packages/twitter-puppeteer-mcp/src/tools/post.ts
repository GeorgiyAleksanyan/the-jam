import { Tool, MCP, ToolInput } from '@modelcontextprotocol/sdk';
import { launchBrowser, preparePage, takeErrorScreenshot, BrowserResult } from '../browser';

interface PostTweetInput extends ToolInput {
  text: string;
  typing_delay_ms?: number;
}

export class PostTweetTool extends Tool {
  constructor(mcp: MCP) {
    super(mcp, {
      name: 'post_tweet',
      description: 'Posts a tweet to Twitter/X.',
      input: {
        text: 'The text content of the tweet.',
        typing_delay_ms: 'Optional delay between keystrokes in milliseconds (e.g., 50 for a human-like speed).',
      },
    });
  }

  async run(input: PostTweetInput): Promise<BrowserResult> {
    const browser = await launchBrowser();
    try {
      const page = await preparePage(browser);
      await page.goto('https://x.com/compose/tweet', { waitUntil: 'networkidle2', timeout: 30000 });

      await page.waitForSelector('[data-testid="tweetTextarea_0"]', { timeout: 15000 });
      await page.click('[data-testid="tweetTextarea_0"]');
      await page.keyboard.type(input.text, { delay: input.typing_delay_ms || 50 });

      await new Promise(r => setTimeout(r, 1000));
      await page.click('[data-testid="tweetButton"]');
      
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
      
      const currentUrl = page.url();
      if (currentUrl.includes('/status/')) {
        return { success: true, tweet_url: currentUrl };
      } else {
        const errorText = await page.evaluate(() => {
            const error = document.querySelector('[data-testid="toast"]');
            return error ? error.textContent : null;
        });
        const screenshotPath = await takeErrorScreenshot(page, 'post-tweet-error');
        return { success: false, error: errorText || 'Failed to post tweet.', screenshot_path: screenshotPath };
      }
    } catch (e: any) {
        if (browser) {
            const pages = await browser.pages();
            const page = pages.length > 0 ? pages[0] : undefined;
            if (page) {
                const screenshotPath = await takeErrorScreenshot(page, 'post-tweet-exception');
                return { success: false, error: e.message, screenshot_path: screenshotPath };
            }
        }
        return { success: false, error: e.message };
    } finally {
      await browser.close();
    }
  }
}
