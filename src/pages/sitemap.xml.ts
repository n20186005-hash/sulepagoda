import type { APIRoute } from 'astro';
import { languagesList, buildAlternates } from '../i18n/ui';

export const prerender = true;

/** hreflang 值需与实际页面 <html lang> 保持一致 */
const hreflang: Record<string, string> = {
  zh: 'zh-CN',
  en: 'en',
  my: 'my',
  ja: 'ja',
  ko: 'ko',
};

/**
 * 只收录各语言首页：条款 / 隐私 / Cookie 设置页已标记 noindex，不应出现在 sitemap 中。
 * 每个 URL 附带 xhtml:link 多语言互指，帮助 Google 按用户所在地区匹配对应语种版本。
 */
export const GET: APIRoute = () => {
  const alts = buildAlternates('');
  const lastmod = new Date().toISOString();

  const urls = languagesList
    .map((lang) => {
      const alternates = [
        ...languagesList.map(
          (alt) => `    <xhtml:link rel="alternate" hreflang="${hreflang[alt]}" href="${alts[alt]}" />`,
        ),
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${alts.xDefault}" />`,
      ].join('\n');

      return [
        '  <url>',
        `    <loc>${alts[lang]}</loc>`,
        `    <lastmod>${lastmod}</lastmod>`,
        alternates,
        '  </url>',
      ].join('\n');
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls}
</urlset>
`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
};
