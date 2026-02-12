const { launchBrowser, preparePage } = require('./dist/browser');

(async () => {
  const tweetUrl = process.argv[2];
  const replyText = process.argv[3];
  
  if (!tweetUrl || !replyText) {
    console.error('Usage: node reply-tweet.js <tweet-url> "reply text"');
    process.exit(1);
  }
  
  console.log('Launching browser...');
  const browser = await launchBrowser();
  
  try {
    const page = await preparePage(browser);
    console.log('Navigating to tweet:', tweetUrl);
    await page.goto(tweetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    // Wait for the reply button
    await new Promise(r => setTimeout(r, 2000));
    
    // Click the reply button on the tweet
    console.log('Looking for reply button...');
    const replyButton = await page.$('[data-testid="reply"]');
    if (replyButton) {
      await replyButton.click();
      await new Promise(r => setTimeout(r, 1500));
    }
    
    // Find and type in the reply textarea
    console.log('Typing reply...');
    await page.waitForSelector('[data-testid="tweetTextarea_0"]', { timeout: 10000 });
    await page.click('[data-testid="tweetTextarea_0"]');
    await page.keyboard.type(replyText, { delay: 45 });
    
    await new Promise(r => setTimeout(r, 1500));
    
    // Click the reply/post button
    console.log('Posting reply...');
    const postButton = await page.$('[data-testid="tweetButtonInline"]');
    if (postButton) {
      await postButton.click();
    } else {
      await page.click('[data-testid="tweetButton"]');
    }
    
    await new Promise(r => setTimeout(r, 4000));
    console.log('Reply posted!');
    
  } catch (e) {
    console.error('Exception:', e.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
