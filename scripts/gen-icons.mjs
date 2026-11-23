// Regenerates public/icon-192.png and public/icon-512.png (run: node scripts/gen-icons.mjs)
import sharp from 'sharp'

for (const size of [192, 512]) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
<rect width="100%" height="100%" fill="#1F4E8C"/>
<text x="50%" y="50%" dy=".35em" text-anchor="middle" font-family="Helvetica, Arial, sans-serif" font-weight="700" font-size="${size * 0.6}" fill="#fff">A</text>
</svg>`
  await sharp(Buffer.from(svg)).png().toFile(`public/icon-${size}.png`)
}
