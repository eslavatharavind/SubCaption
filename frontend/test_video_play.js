const { chromium } = require('./node_modules/playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  
  const videoPath = path.resolve('../backend/test_input_sample.mp4').replace(/\\/g, '/');
  console.log('Testing video path:', videoPath);
  
  await page.setContent(`
    <!DOCTYPE html>
    <html>
      <body style="margin:0; background:black;">
        <video id="v" src="file:///${videoPath}" playsinline muted></video>
      </body>
    </html>
  `);
  
  const canPlay = await page.evaluate(async () => {
    const v = document.getElementById('v');
    return new Promise((resolve) => {
      v.onloadedmetadata = () => resolve({ duration: v.duration, width: v.videoWidth, height: v.videoHeight });
      v.onerror = (e) => resolve({ error: v.error ? v.error.message : 'error' });
      setTimeout(() => resolve({ timeout: true }), 5000);
    });
  });
  
  console.log('Video loaded metadata result:', canPlay);
  await browser.close();
})();
