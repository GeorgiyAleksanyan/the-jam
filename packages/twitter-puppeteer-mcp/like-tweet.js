const { launchBrowser, preparePage } = require('./dist/browser');

(async () => {
  const tweetUrl = process.argv[2];
  
  if (!tweetUrl) {
    console.error('Usage: node like-tweet.js <tweet-url>');
    process.exit(1);
  }
  
  console.log('Launching browser...');
  const browser = await launchBrowser();
  
  try {
    const page = await preparePage(browser);
    console.log('Navigating to tweet:', tweetUrl);
    await page.goto(tweetUrl, { waitUntil: 'networkidle2', timeout: 30000 });
    
    await new Promise(r => setTimeout(r, 2000));
    
    console.log('Clicking like...');
    const likeButton = await page.$('[data-testid="like"]');
    if (likeButton) {
      await likeButton.click();
      await new Promise(r => setTimeout(r, 1000));
      console.log('Liked!');
    } else {
      console.log('Already liked or button not found');
    }
    
  } catch (e) {
    console.error('Exception:', e.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
