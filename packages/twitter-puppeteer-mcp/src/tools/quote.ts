import { Tool, MCP, ToolInput } from '@modelcontextprotocol/sdk';
import { launchBrowser, preparePage, takeErrorScreenshot, BrowserResult } from '../browser';

interface QuoteTweetInput extends ToolInput {
  tweet_url: string;
  text: string;
  typing_delay_ms?: number;
}

export class QuoteTweetTool extends Tool {
  constructor(mcp: MCP) {
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

  async run(input: QuoteTweetInput): Promise<BrowserResult> {
    const browser = await launchBrowser();
    try {
      const page = await preparePage(browser);
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
      } else {
        const screenshotPath = await takeErrorScreenshot(page, 'quote-tweet-error');
        return { success: false, error: 'Failed to quote tweet.', screenshot_path: screenshotPath };
      }
    } catch (e: any) {
        if (browser) {
            const pages = await browser.pages();
            const page = pages.length > 0 ? pages[0] : undefined;
            if (page) {
                const screenshotPath = await takeErrorScreenshot(page, 'quote-tweet-exception');
                return { success: false, error: e.message, screenshot_path: screenshotPath };
            }
        }
        return { success: false, error: e.message };
    } finally {
      await browser.close();
    }
  }
}
