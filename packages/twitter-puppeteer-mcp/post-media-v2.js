const { launchBrowser, preparePage } = require('./dist/browser');
const path = require('path');

(async () => {
  const text = process.argv[2];
  const imagePath = process.argv[3];
  
  if (!text) {
    console.error('Usage: node post-media-v2.js "tweet text" [image-path]');
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
      console.log('Looking for file input...');
      // Wait for the media button and file input to be ready
      await new Promise(r => setTimeout(r, 2000));
      
      const fileInput = await page.$('input[type="file"][accept*="image"]');
      if (fileInput) {
        console.log('Uploading image:', imagePath);
        await fileInput.uploadFile(path.resolve(imagePath));
        
        // Wait for upload to complete - look for the image preview
        console.log('Waiting for image preview...');
        try {
          await page.waitForSelector('[data-testid="attachments"]', { timeout: 15000 });
          console.log('Image uploaded and preview visible');
        } catch (e) {
          console.log('Warning: Could not confirm image preview, continuing...');
        }
        await new Promise(r => setTimeout(r, 2000));
      } else {
        console.log('Warning: No file input found');
      }
    }
    
    // Click and type
    await page.click('[data-testid="tweetTextarea_0"]');
    console.log('Typing tweet...');
    await page.keyboard.type(text, { delay: 30 });

    await new Promise(r => setTimeout(r, 2000));
    
    // Screenshot before posting
    await page.screenshot({ path: '/tmp/before-post.png' });
    console.log('Screenshot saved: /tmp/before-post.png');
    
    console.log('Clicking post button...');
    await page.click('[data-testid="tweetButton"]');
    
    // Wait for the compose modal to close or navigate away
    console.log('Waiting for post confirmation...');
    try {
      await page.waitForFunction(() => {
        return !document.querySelector('[data-testid="tweetTextarea_0"]') || 
               document.querySelector('[data-testid="toast"]');
      }, { timeout: 10000 });
      console.log('Post confirmed!');
    } catch (e) {
      console.log('Warning: Could not confirm post, taking screenshot...');
      await page.screenshot({ path: '/tmp/after-post.png' });
    }
    
    await new Promise(r => setTimeout(r, 3000));
    console.log('Tweet posted!');
    
  } catch (e) {
    console.error('Exception:', e.message);
    await page.screenshot({ path: '/tmp/error-state.png' });
    process.exit(1);
  } finally {
    await browser.close();
  }
})();
