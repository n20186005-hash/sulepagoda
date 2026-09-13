/**
 * 图片资源优化脚本
 * - 规范命名：sule-pagoda-yangon-myanmar-<n>.jpg / .webp
 * - JPG 压缩至最长边 1920px（渐进式 mozjpeg q80）
 * - WebP 压缩至最长边 1600px（q72）
 * - 同时瘦身 og-image.jpg 与 PWA 图标
 *
 * 用法：node scripts/optimize-images.mjs
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const galleryDir = path.join(root, 'public', 'gallery');
const publicDir = path.join(root, 'public');

const SOURCE_RE = /^sule-pagoda-(\d+)\.jpg$/;

async function optimizeGallery() {
  const entries = await fs.readdir(galleryDir);
  const sources = entries.filter((f) => SOURCE_RE.test(f)).sort();

  for (const file of sources) {
    const index = file.match(SOURCE_RE)[1];
    const base = `sule-pagoda-yangon-myanmar-${index}`;
    const input = path.join(galleryDir, file);
    const buffer = await fs.readFile(input);
    const meta = await sharp(buffer).metadata();

    await sharp(buffer)
      .rotate()
      .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 80, mozjpeg: true, progressive: true })
      .toFile(path.join(galleryDir, `${base}.jpg`));

    await sharp(buffer)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 72, effort: 5 })
      .toFile(path.join(galleryDir, `${base}.webp`));

    await fs.unlink(input);
    const oldWebp = path.join(galleryDir, `sule-pagoda-${index}.webp`);
    try {
      await fs.unlink(oldWebp);
    } catch {
      /* legacy webp 不存在时忽略 */
    }

    console.log(`✓ ${file} (${meta.width}x${meta.height}) -> ${base}.jpg / ${base}.webp`);
  }
}

async function optimizeOgImage() {
  const heroJpg = path.join(galleryDir, 'sule-pagoda-yangon-myanmar-1.jpg');
  const ogPath = path.join(publicDir, 'og-image.jpg');
  const buffer = await fs.readFile(heroJpg);

  await sharp(buffer)
    .resize({ width: 1200, height: 630, fit: 'cover', position: 'centre' })
    .jpeg({ quality: 82, mozjpeg: true, progressive: true })
    .toFile(ogPath);

  const { size } = await fs.stat(ogPath);
  console.log(`✓ og-image.jpg -> ${(size / 1024).toFixed(0)} KB`);
}

async function optimizeIcons() {
  for (const size of [512, 192, 180]) {
    const iconPath = path.join(publicDir, `icon-${size}.png`);
    const buffer = await fs.readFile(iconPath);
    await sharp(buffer)
      .resize(size, size, { fit: 'cover' })
      .png({ compressionLevel: 9, palette: true, quality: 92 })
      .toFile(iconPath);
    const { size: out } = await fs.stat(iconPath);
    console.log(`✓ icon-${size}.png -> ${(out / 1024).toFixed(1)} KB`);
  }
}

await optimizeGallery();
await optimizeOgImage();
await optimizeIcons();
console.log('图片优化完成。');
