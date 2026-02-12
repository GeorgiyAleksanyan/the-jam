const { launchBrowser, preparePage } = require('./dist/browser');

(async () => {
  const quoteTweetUrl = process.argv[2];
  const comment = process.argv[3];
  
  if (!quoteTweetUrl || !comment) {
    console.error('Usage: node quote-tweet.js <tweet-url-to-quote> "your comment"');
    process.exit(1);
  }
  
  // Extract tweet ID from URL
  const tweetId = quoteTweetUrl.match(/status\/(\d+)/)?.[1];
  if (!tweetId) {
    console.error('Could not extract tweet ID from URL');
    process.exit(1);
  }
  
  console.log('Launching browser...');
  const browser = await launchBrowser();
  
  try {
    const page = await preparePage(browser);
    
    // Navigate directly to compose with quote URL
    const quoteUrl = `https://x.com/compose/tweet?quote_tweet_id=${tweetId}`;
    console.log('Navigating to quote compose:', quoteUrl);
    await page.goto(quoteUrl, { waitUntil: 'networkidle2', timeout: 30000 });

    console.log('Waiting for textarea...');
    await page.waitForSelector('[data-testid="tweetTextarea_0"]', { timeout: 15000 });
    await page.click('[data-testid="tweetTextarea_0"]');
    
    console.log('Typing comment...');
    await page.keyboard.type(comment, { delay: 45 });

    console.log('Waiting before posting...');
    await new Promise(r => setTimeout(r, 2000));
    
    console.log('Clicking post button...');
    await page.click('[data-testid="tweetButton"]');
    
    console.log('Waiting for post...');
    await new Promise(r => setTimeout(r, 5000));
    
    console.log('Quote tweet posted!');
  } catch (e) {
    console.error('Exception:', e.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
