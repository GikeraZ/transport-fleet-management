const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [192, 512];
const svgPath = path.join(__dirname, '..', 'public', 'icon.svg');
const outputDir = path.join(__dirname, '..', 'public');

async function generateIcon(size) {
  const svg = fs.readFileSync(svgPath, 'utf-8');
  const outputPath = path.join(outputDir, `pwa-${size}x${size}.png`);
  
  await sharp(Buffer.from(svg))
    .resize(size, size)
    .png()
    .toFile(outputPath);
  
  console.log(`Generated ${outputPath}`);
}

async function main() {
  for (const size of sizes) {
    await generateIcon(size);
  }
  console.log('All icons generated successfully!');
}

main().catch(console.error);
