const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const sharp = require('sharp');

async function generateFavicons() {
  const publicDir = path.join(process.cwd(), 'public');
  const sourceImage = path.join(process.cwd(), 'remote_logo.jpg');

  if (!fs.existsSync(sourceImage)) {
    throw new Error('Source logo remote_logo.jpg does not exist!');
  }

  console.log('Generating base high-resolution 512x512 circular logo badge with gold ring...');

  // 1. Create outer gold badge background
  const size = 512;
  const svgBadge = Buffer.from(`
    <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="256" cy="256" r="250" fill="#D4AF37" />
      <circle cx="256" cy="256" r="242" fill="#0F172A" />
    </svg>
  `);

  // 2. Circular mask for inner logo (480x480)
  const circleMask = Buffer.from(`
    <svg width="480" height="480" viewBox="0 0 480 480" xmlns="http://www.w3.org/2000/svg">
      <circle cx="240" cy="240" r="240" fill="white" />
    </svg>
  `);

  // 3. Resize and mask the logo image
  const resizedLogo = await sharp(sourceImage)
    .resize(480, 480, { fit: 'cover' })
    .toBuffer();

  const maskedLogo = await sharp(resizedLogo)
    .composite([{ input: circleMask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  // 4. Composite inner logo into the gold badge
  const masterBadge = await sharp(svgBadge)
    .composite([{ input: maskedLogo, top: 16, left: 16 }])
    .png({ compressionLevel: 9 })
    .toBuffer();

  const masterPath = path.join(process.cwd(), 'master_badge.png');
  fs.writeFileSync(masterPath, masterBadge);
  console.log('Master badge created at', masterPath, 'size:', masterBadge.length, 'bytes');

  // 5. Generate all required PNG favicon dimensions
  const pngConfigs = [
    { name: 'favicon-16x16.png', size: 16 },
    { name: 'favicon-32x32.png', size: 32 },
    { name: 'favicon-48x48.png', size: 48 },
    { name: 'favicon-96x96.png', size: 96 },
    { name: 'favicon-144x144.png', size: 144 },
    { name: 'favicon-192x192.png', size: 192 },
    { name: 'favicon-512x512.png', size: 512 },
    { name: 'favicon.png', size: 512 },
    { name: 'logo.png', size: 512 }
  ];

  for (const config of pngConfigs) {
    const destPath = path.join(publicDir, config.name);
    await sharp(masterPath)
      .resize(config.size, config.size, {
        kernel: sharp.kernel.lanczos3
      })
      .png({ compressionLevel: 9 })
      .toFile(destPath);
    console.log(`Generated ${config.name} (${config.size}x${config.size})`);
  }

  // 6. Generate apple-touch-icon.png (180x180 with solid midnight navy background)
  const appleTouchPath = path.join(publicDir, 'apple-touch-icon.png');
  const appleBackground = Buffer.from(`
    <svg width="180" height="180" viewBox="0 0 180 180" xmlns="http://www.w3.org/2000/svg">
      <rect width="180" height="180" fill="#0F172A" rx="36" />
    </svg>
  `);
  const scaledBadgeForApple = await sharp(masterPath)
    .resize(164, 164, { kernel: sharp.kernel.lanczos3 })
    .toBuffer();

  await sharp(appleBackground)
    .composite([{ input: scaledBadgeForApple, top: 8, left: 8 }])
    .png({ compressionLevel: 9 })
    .toFile(appleTouchPath);
  console.log('Generated apple-touch-icon.png (180x180)');

  // 7. Generate multi-resolution favicon.ico using ImageMagick
  const icoPath = path.join(publicDir, 'favicon.ico');
  const p16 = path.join(publicDir, 'favicon-16x16.png');
  const p32 = path.join(publicDir, 'favicon-32x32.png');
  const p48 = path.join(publicDir, 'favicon-48x48.png');

  console.log('Building multi-resolution favicon.ico with ImageMagick...');
  execSync(`convert "${p16}" "${p32}" "${p48}" "${icoPath}"`);
  console.log('Generated favicon.ico with 16x16, 32x32, 48x48 icon resources.');

  // 8. Generate og-image.png (1200x630)
  const ogImagePath = path.join(publicDir, 'og-image.png');
  const ogSvg = Buffer.from(`
    <svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#0B0F19" />
          <stop offset="50%" stop-color="#0F172A" />
          <stop offset="100%" stop-color="#1E293B" />
        </linearGradient>
        <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#D4AF37" />
          <stop offset="100%" stop-color="#F3E5AB" />
        </linearGradient>
      </defs>
      <rect width="1200" height="630" fill="url(#bgGrad)" />
      <circle cx="1050" cy="150" r="220" fill="#D4AF37" opacity="0.05" />
      <circle cx="150" cy="500" r="280" fill="#3B82F6" opacity="0.05" />
      
      <!-- Text content -->
      <text x="560" y="270" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="64" font-weight="800" fill="url(#goldGrad)">SJ Tutor AI</text>
      <text x="560" y="340" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="32" font-weight="600" fill="#FFFFFF">Your AI Study Buddy</text>
      <text x="560" y="400" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="20" font-weight="400" fill="#94A3B8">Interactive Tutoring • Instant Quizzes • Curriculum Summaries</text>
      <rect x="560" y="440" width="280" height="44" rx="22" fill="#D4AF37" fill-opacity="0.15" stroke="#D4AF37" stroke-width="2" />
      <text x="700" y="468" text-anchor="middle" font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="600" fill="#D4AF37">sjtutorai.vercel.app</text>
    </svg>
  `);

  const scaledBadgeForOg = await sharp(masterPath)
    .resize(360, 360, { kernel: sharp.kernel.lanczos3 })
    .toBuffer();

  await sharp(ogSvg)
    .composite([{ input: scaledBadgeForOg, top: 135, left: 120 }])
    .png({ compressionLevel: 9 })
    .toFile(ogImagePath);
  console.log('Generated og-image.png (1200x630)');

  console.log('All favicon and branding assets generated successfully!');
}

generateFavicons().catch(err => {
  console.error('Failed to generate favicons:', err);
  process.exit(1);
});
