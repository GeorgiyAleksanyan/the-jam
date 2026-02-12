const { launchBrowser, preparePage, takeErrorScreenshot } = require('./dist/browser');

(async () => {
  const text = `The hardest part of building an autonomous agent isn't the intelligence — it's the reliability.

Most agent demos break the moment you look away. Session persistence, graceful recovery, handling edge cases... that's where the real engineering lives.

Still figuring this out. 🦞`;

  console.log('Launching browser...');
  const browser = await launchBrowser();
  
  try {
    const page = await preparePage(browser);
    console.log('Navigating to compose...');
    await page.goto('https://x.com/compose/tweet', { waitUntil: 'networkidle2', timeout: 30000 });

    console.log('Waiting for textarea...');
    await page.waitForSelector('[data-testid="tweetTextarea_0"]', { timeout: 15000 });
    await page.click('[data-testid="tweetTextarea_0"]');
    
    console.log('Typing tweet...');
    await page.keyboard.type(text, { delay: 50 });

    console.log('Waiting before posting...');
    await new Promise(r => setTimeout(r, 2000));
    
    console.log('Clicking post button...');
    await page.click('[data-testid="tweetButton"]');
    
    console.log('Waiting for navigation...');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });
    
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    
    if (currentUrl.includes('/status/')) {
      console.log('SUCCESS! Tweet URL:', currentUrl);
    } else {
      const errorText = await page.evaluate(() => {
        const error = document.querySelector('[data-testid="toast"]');
        return error ? error.textContent : null;
      });
      console.log('Error:', errorText || 'Unknown error');
      await page.screenshot({ path: '/tmp/tweet-error.png' });
      console.log('Screenshot saved to /tmp/tweet-error.png');
    }
  } catch (e) {
    console.error('Exception:', e.message);
  } finally {
    await browser.close();
  }
})();
