const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

async function convert() {
  const svgPath = path.join(__dirname, '../data/2026_조직도.svg');
  const jpgPath = path.join(__dirname, '../data/2026_조직도.jpeg');
  const altJpgPath = path.join(__dirname, '../data/2026_조직도.jpg');

  const svgBuffer = fs.readFileSync(svgPath);

  // 2400x1800 고해상도 JPEG로 변환
  await sharp(svgBuffer, { density: 300 })
    .resize(2400, 1800)
    .jpeg({ quality: 95, chromaSubsampling: '4:4:4' })
    .toFile(jpgPath);

  // 동일한 내용을 .jpg 로도 복사/저장
  fs.copyFileSync(jpgPath, altJpgPath);

  console.log('Successfully generated JPEG organization charts:');
  console.log('1.', jpgPath);
  console.log('2.', altJpgPath);
}

convert().catch(err => {
  console.error('Conversion failed:', err);
  process.exit(1);
});
