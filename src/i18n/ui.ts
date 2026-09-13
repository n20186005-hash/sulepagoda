import zh from './zh.json';
import en from './en.json';
import my from './my.json';
import shn from './shn.json';
import mnw from './mnw.json';
import ja from './ja.json';
import ko from './ko.json';
import { siteConfig } from '../config';

export const defaultLang = 'my';
export const languagesList = ['zh', 'en', 'my', 'ja', 'ko'] as const;

export const languages: Record<string, string> = {
  zh: '中文',
  en: 'English',
  my: 'မြန်မာ',
  ja: '日本語',
  ko: '한국어',
};

const ui: Record<string, any> = { zh, en, my, ja, ko };

export function getLangFromUrl(url: URL): string {
  const seg = url.pathname.split('/').filter(Boolean);
  const lang = seg[0];
  return (languagesList as readonly string[]).includes(lang) ? lang : defaultLang;
}

export function getI18n(url: URL) {
  const lang = getLangFromUrl(url);
  const messages = ui[lang];
  const t = (key: string): string => {
    const found = key
      .split('.')
      .reduce<any>((o, i) => (o == null ? undefined : o[i]), messages);
    return found ?? '';
  };
  return { lang, messages, t };
}

export function buildAlternates(path = ''): Record<string, string> {
  // 域名只在 siteConfig 中维护一处，避免 canonical / hreflang / sitemap 之间出现主机名分歧
  const base = siteConfig.baseUrl.replace(/\/+$/, '');
  const clean = path.replace(/^\/+/, '').replace(/\/+$/, '');
  // 统一带尾部斜杠：build.format 为 directory，实际可访问地址是 /en/ 而非 /en，
  // 保持 canonical / hreflang / sitemap 与真实 URL 完全一致，避免被判定为两个地址。
  const mk = (l: string) => `${base}/${l}${clean ? '/' + clean : ''}/`;
  return {
    zh: mk('zh'),
    en: mk('en'),
    my: mk('my'),
    ja: mk('ja'),
    ko: mk('ko'),
    xDefault: mk('my'),
  };
}

export function htmlLangAttr(lang: string): string {
  if (lang === 'zh') return 'zh-CN';
  return lang;
}
