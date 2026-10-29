const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const { chromium } = require('../node_modules/playwright');

// Reference canvas widths from preview VideoPlayer.tsx
const REF_WIDTHS = {
  '9:16': 360,
  '16:9': 580,
  '1:1': 380,
  '4:5': 360,
  '4:3': 500,
  '21:9': 620,
};

function parseArgs() {
  const args = process.argv.slice(2);
  const params = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].substring(2);
      const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true;
      params[key] = val;
    }
  }
  return params;
}

function probeVideo(ffmpegPath, inputPath) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, ['-i', inputPath], { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    proc.stderr.on('data', (d) => { stderr += d.toString(); });
    proc.on('close', () => {
      let width = 1080;
      let height = 1920;
      let duration = 5.0;
      let fps = 30;
      let hasAudio = stderr.includes('Audio:');
      let audioIsAac = stderr.includes('Audio: aac');

      // Extract resolution
      const resMatch = stderr.match(/Stream #\d+:\d+.*Video:.*, (\d{2,4})x(\d{2,4})/);
      if (resMatch) {
        width = parseInt(resMatch[1], 10);
        height = parseInt(resMatch[2], 10);
      }

      // Extract duration
      const durMatch = stderr.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
      if (durMatch) {
        const hrs = parseFloat(durMatch[1]);
        const mins = parseFloat(durMatch[2]);
        const secs = parseFloat(durMatch[3]);
        duration = hrs * 3600 + mins * 60 + secs;
      }

      // Extract FPS
      const fpsMatch = stderr.match(/, (\d+(\.\d+)?) fps/);
      if (fpsMatch) {
        fps = Math.min(30, Math.max(15, Math.round(parseFloat(fpsMatch[1]))));
      }

      resolve({ width, height, duration, fps, hasAudio, audioIsAac });
    });
    proc.on('error', reject);
  });
}

function runFfmpeg(ffmpegPath, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    proc.stderr.on('data', (d) => { err += d.toString(); });
    proc.on('close', (code) => (code === 0 ? resolve() : reject(new Error('FFmpeg exited with code ' + code + ': ' + err.slice(-400)))));
    proc.on('error', reject);
  });
}

/** True when a visible caption/text layer is set to "Behind character". */
function needsPersonMatte(segments, textLayers) {
  const cap = (segments[0] && segments[0].caption_layer) || {};
  const captionBehind = segments.length > 0 && cap.visible !== false && cap.layering === 'behind';
  return captionBehind || textLayers.some((l) => l.visible !== false && l.layering === 'behind');
}

/**
 * Behind Character export. Three layers are composited by FFmpeg:
 *   video -> BEHIND text/captions -> person (video frame x matte) -> FRONT text/captions
 * The matte comes from the same MediaPipe selfie model the preview uses, run on every frame in the render page.
 */
async function renderWithPerson({ page, ffmpegPath, inputVideo, outputVideo, meta, width, height, fps, duration, emit }) {
  const work = fs.mkdtempSync(path.join(require('os').tmpdir(), 'cc_export_'));
  const dirs = { src: path.join(work, 'src'), mask: path.join(work, 'mask'), behind: path.join(work, 'behind'), front: path.join(work, 'front') };
  Object.values(dirs).forEach((d) => fs.mkdirSync(d, { recursive: true }));
  try {
    const totalFrames = Math.max(1, Math.round(duration * fps));
    const MAX_DIM = 480;
    const k = Math.min(1, MAX_DIM / Math.max(width, height));
    const sw = Math.max(2, Math.round((width * k) / 2) * 2);
    const sh = Math.max(2, Math.round((height * k) / 2) * 2);

    emit('status', 'Extracting frames for person segmentation...');
    await runFfmpeg(ffmpegPath, ['-y', '-i', inputVideo, '-vf', `fps=${fps},scale=${sw}:${sh}`, '-frames:v', String(totalFrames), path.join(dirs.src, '%06d.png')]);
    const have = fs.readdirSync(dirs.src).length;
    if (have === 0) throw new Error('Could not decode any video frames for segmentation.');

    const name = (i) => String(i + 1).padStart(6, '0') + '.png';
    let coverageSum = 0;
    for (let f = 0; f < totalFrames; f++) {
      const src = fs.readFileSync(path.join(dirs.src, name(Math.min(f, have - 1))));
      const res = await page.evaluate((u) => window.__SEGMENT_FRAME__(u), 'data:image/png;base64,' + src.toString('base64'));
      coverageSum += res.coverage;
      fs.writeFileSync(path.join(dirs.mask, name(f)), Buffer.from(res.matte.split(',')[1], 'base64'));
      if (f % 5 === 0 || f === totalFrames - 1) emit('progress', Math.min(40, Math.round(((f + 1) / totalFrames) * 40)), `Segmenting person: frame ${f + 1}/${totalFrames}`);
    }
    console.log(`Person matte: ${totalFrames} frames, mean coverage ${((coverageSum / totalFrames) * 100).toFixed(1)}%`);

    for (const pass of ['behind', 'front']) {
      await page.evaluate((x) => window.__SET_PASS__(x), pass);
      await page.evaluate(() => window.__SEEK_TIME__(-999));
      const empty = await page.screenshot({ omitBackground: true, type: 'png' });
      let last = null;
      let lastKey = '';
      for (let f = 0; f < totalFrames; f++) {
        const info = await page.evaluate((t) => window.__SEEK_TIME__(t), f / fps);
        let png;
        if (!info.hasContent) {
          png = empty;
          lastKey = 'empty';
        } else if (!info.isAnimating && info.stateKey === lastKey && last) {
          png = last;
        } else {
          png = await page.screenshot({ omitBackground: true, type: 'png' });
          last = png;
          lastKey = info.stateKey;
        }
        fs.writeFileSync(path.join(dirs[pass], name(f)), png);
        if (f % 5 === 0 || f === totalFrames - 1) {
          const base = pass === 'behind' ? 40 : 70;
          emit('progress', base + Math.round(((f + 1) / totalFrames) * 30), `Rendering ${pass} layers: frame ${f + 1}/${totalFrames}`);
        }
      }
    }

    emit('status', 'Compositing video, behind layers, person and front layers...');
    const args = [
      '-y', '-i', inputVideo,
      '-framerate', String(fps), '-i', path.join(dirs.behind, '%06d.png'),
      '-framerate', String(fps), '-i', path.join(dirs.mask, '%06d.png'),
      '-framerate', String(fps), '-i', path.join(dirs.front, '%06d.png'),
      '-filter_complex',
      `[0:v]split=2[base][fg];[2:v]scale=${width}:${height},format=gray[m];[fg]format=rgba[fgr];[fgr][m]alphamerge[person];[base][1:v]overlay=0:0:format=auto[x];[x][person]overlay=0:0:format=auto[y];[y][3:v]overlay=0:0:format=auto,format=yuv420p[out]`,
      '-map', '[out]',
    ];
    if (meta.hasAudio) args.push('-map', '0:a:0', '-c:a', meta.audioIsAac ? 'copy' : 'aac', ...(meta.audioIsAac ? [] : ['-b:a', '192k']));
    else args.push('-an');
    args.push('-c:v', 'libx264', '-preset', 'veryfast', '-crf', '18', '-shortest', outputVideo);
    await runFfmpeg(ffmpegPath, args);
  } finally {
    fs.rmSync(work, { recursive: true, force: true });
  }
}

async function main() {
  const params = parseArgs();
  const jobFile = params.job;
  const inputVideo = params.input;
  const outputVideo = params.output;
  const ffmpegPath = params.ffmpeg || 'ffmpeg';
  const port = params.port || 3000;

  if (!jobFile || !inputVideo || !outputVideo) {
    console.error('Usage: node render_export.js --job <job.json> --input <in.mp4> --output <out.mp4> [--ffmpeg <path>] [--port 3000]');
    process.exit(1);
  }

  const jobData = JSON.parse(fs.readFileSync(jobFile, 'utf8'));
  const segments = jobData.segments || [];
  const templateConfig = jobData.templateConfig || jobData.template_config || {};
  const textLayers = jobData.textLayers || jobData.text_layers || [];
  const aspectRatio = jobData.aspectRatio || jobData.aspect_ratio || '9:16';

  console.log(JSON.stringify({ type: 'status', message: 'Analyzing video properties...' }));
  const meta = await probeVideo(ffmpegPath, inputVideo);
  console.log('Video metadata:', meta);

  const width = meta.width;
  const height = meta.height;
  const duration = meta.duration;
  const fps = meta.fps;

  const refWidth = REF_WIDTHS[aspectRatio] || 360;
  const scaleMultiplier = width / refWidth;
  console.log(`Dimensions: ${width}x${height}, FPS: ${fps}, RefWidth: ${refWidth}, ScaleMultiplier: ${scaleMultiplier}`);

  console.log(JSON.stringify({ type: 'status', message: 'Launching render engine...' }));
  const browser = await chromium.launch({
    channel: 'chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });

  const renderUrl = `http://localhost:${port}/export-render`;
  console.log(`Navigating to ${renderUrl}...`);
  await page.goto(renderUrl, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => typeof window.__INIT_RENDER__ === 'function', { timeout: 20000 });

  console.log(JSON.stringify({ type: 'status', message: 'Initializing preview renderer...' }));
  await page.evaluate(
    (payload) => window.__INIT_RENDER__(payload),
    {
      segments,
      templateConfig,
      textLayers,
      aspectRatio,
      width,
      height,
      scaleMultiplier,
    }
  );

  // Await web fonts ready
  await page.evaluate(() => document.fonts.ready);
  await new Promise((r) => setTimeout(r, 100));

  if (needsPersonMatte(segments, textLayers)) {
    const emit = (type, a, b) =>
      console.log(JSON.stringify(type === 'progress' ? { type, pct: a, message: b } : { type, message: a }));
    const outDir0 = path.dirname(outputVideo);
    if (!fs.existsSync(outDir0)) fs.mkdirSync(outDir0, { recursive: true });
    await renderWithPerson({ page, ffmpegPath, inputVideo, outputVideo, meta, width, height, fps, duration, emit });
    await browser.close();
    console.log(JSON.stringify({ type: 'complete', output: outputVideo }));
    return;
  }

  // Generate cached blank transparent PNG
  await page.evaluate(() => window.__SEEK_TIME__(-999));
  const emptyPng = await page.screenshot({ omitBackground: true, type: 'png' });

  // Ensure output directory exists
  const outDir = path.dirname(outputVideo);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // Construct FFmpeg command
  const ffmpegArgs = [
    '-y',
    '-i', inputVideo,
    '-f', 'image2pipe',
    '-vcodec', 'png',
    '-framerate', fps.toString(),
    '-i', '-',
    '-filter_complex', '[0:v][1:v]overlay=0:0',
    '-c:v', 'libx264',
    '-preset', 'veryfast',
    '-crf', '18',
    '-pix_fmt', 'yuv420p',
  ];

  if (meta.hasAudio) {
    if (meta.audioIsAac) {
      ffmpegArgs.push('-c:a', 'copy');
    } else {
      ffmpegArgs.push('-c:a', 'aac', '-b:a', '192k');
    }
  } else {
    ffmpegArgs.push('-an');
  }

  ffmpegArgs.push(outputVideo);

  console.log(JSON.stringify({ type: 'status', message: 'Beginning frame-by-frame render overlay...' }));
  const proc = spawn(ffmpegPath, ffmpegArgs, { stdio: ['pipe', 'pipe', 'pipe'] });

  let ffmpegErr = '';
  proc.stderr.on('data', (d) => {
    ffmpegErr += d.toString();
  });

  const totalFrames = Math.max(1, Math.round(duration * fps));
  let lastPng = null;
  let lastStateKey = '';
  let renderedFrames = 0;
  let cachedFrames = 0;

  for (let f = 0; f < totalFrames; f++) {
    const t = f / fps;
    const info = await page.evaluate((time) => window.__SEEK_TIME__(time), t);

    let framePng;
    if (!info.hasContent) {
      framePng = emptyPng;
      lastStateKey = 'empty';
      cachedFrames++;
    } else if (!info.isAnimating && info.stateKey === lastStateKey && lastPng) {
      framePng = lastPng;
      cachedFrames++;
    } else {
      framePng = await page.screenshot({ omitBackground: true, type: 'png' });
      lastPng = framePng;
      lastStateKey = info.stateKey;
      renderedFrames++;
    }

    if (!proc.stdin.write(framePng)) {
      await new Promise((resolve) => proc.stdin.once('drain', resolve));
    }

    if (f % Math.max(1, Math.floor(fps / 2)) === 0 || f === totalFrames - 1) {
      const pct = Math.min(99, Math.round(((f + 1) / totalFrames) * 100));
      console.log(
        JSON.stringify({
          type: 'progress',
          pct,
          message: `Rendering captions: ${pct}% (frame ${f + 1}/${totalFrames})`,
        })
      );
    }
  }

  console.log(`Render stats: ${renderedFrames} unique frames rendered, ${cachedFrames} identical frames reused.`);
  proc.stdin.end();

  await new Promise((resolve, reject) => {
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg exited with code ${code}: ${ffmpegErr.slice(-400)}`));
    });
    proc.on('error', reject);
  });

  await browser.close();
  console.log(JSON.stringify({ type: 'complete', output: outputVideo }));
}

main().catch((err) => {
  console.error('Fatal render export error:', err);
  process.exit(1);
});
