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
      // Let Puppeteer find Chrome automatically
    });

    // Create a new page
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({
      width: 1200,
      height: 630,
      deviceScaleFactor: 2
    });

    // Set content
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    // Take screenshot
    const screenshot = await page.screenshot({
      type: 'jpeg',
      quality: 100,
      encoding: 'base64'
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