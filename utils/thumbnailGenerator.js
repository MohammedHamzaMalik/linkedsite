const puppeteer = require('puppeteer');

async function generateThumbnail(htmlContent) {
  let browser = null;
  
  try {
    // Launch browser with flexible configuration
    browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ],
      headless: 'new',
    });

    // Create a new page
    const page = await browser.newPage();
    
    // Set viewport to match the desired thumbnail dimensions
    await page.setViewport({
      width: 1200,
      height: 630,
      deviceScaleFactor: 1 // Set to 1 for clearer rendering
    });

    // Set content and wait for rendering
    await page.setContent(htmlContent, { 
      waitUntil: 'networkidle0',
      timeout: 30000
    });

    // Make sure everything is properly laid out
    await page.evaluate(() => {
      // Force layout if needed
      document.body.style.width = '1200px';
      document.body.style.height = '630px';
    });

    // Take screenshot with exact dimensions
    const screenshot = await page.screenshot({
      type: 'jpeg',
      quality: 100,
      encoding: 'base64',
      clip: {
        x: 0,
        y: 0,
        width: 1200,
        height: 630
      }
    });

    return screenshot;
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    throw error;
  } finally {
    // Always close the browser
    if (browser) {
      await browser.close();
    }
  }
}

module.exports = { generateThumbnail };