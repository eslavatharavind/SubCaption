const { chromium } = require('./node_modules/playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 } });
  await page.setContent('<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:white;font-size:80px;font-family:sans-serif;">Test Caption</div>');
  const t0 = Date.now();
  for (let i = 0; i < 10; i++) {
    await page.screenshot({ omitBackground: true, type: 'png' });
  }
  const t1 = Date.now();
  console.log('10 screenshots took:', t1 - t0, 'ms. Average per screenshot:', (t1 - t0) / 10, 'ms');
  await browser.close();
})();
