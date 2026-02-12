const { launchBrowser, preparePage } = require('./dist/browser');
const path = require('path');

(async () => {
  const text = process.argv[2];
  const imagePath = process.argv[3];
  
  if (!text) {
    console.error('Usage: node post-media.js "tweet text" [image-path]');
    process.exit(1);
  }
  
  console.log('Launching browser...');
  const browser = await launchBrowser();
  
  try {
    const page = await preparePage(browser);
    console.log('Navigating to compose...');
    await page.goto('https://x.com/compose/tweet', { waitUntil: 'networkidle2', timeout: 30000 });

    console.log('Waiting for textarea...');
    await page.waitForSelector('[data-testid="tweetTextarea_0"]', { timeout: 15000 });
    
    // If image provided, upload it first
    if (imagePath) {
      console.log('Uploading image:', imagePath);
      const fileInput = await page.$('input[type="file"][accept*="image"]');
      if (fileInput) {
        await fileInput.uploadFile(path.resolve(imagePath));
        await new Promise(r => setTimeout(r, 4000)); // Wait for upload
        console.log('Image uploaded');
      }
    }
    
    await page.click('[data-testid="tweetTextarea_0"]');
    
    console.log('Typing tweet...');
    await page.keyboard.type(text, { delay: 35 });

    await new Promise(r => setTimeout(r, 2000));
    
    console.log('Clicking post button...');
    await page.click('[data-testid="tweetButton"]');
    
    // Don't wait for navigation - just wait a fixed time
    await new Promise(r => setTimeout(r, 5000));
    
    console.log('Tweet posted!');
  } catch (e) {
    console.error('Exception:', e.message);
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
