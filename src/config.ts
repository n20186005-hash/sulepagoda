export const siteConfig = {
  name: 'Sule Pagoda',
  baseUrl: 'https://sulepagoda.com',
  slug: 'sule-pagoda',
  locales: ['zh', 'en', 'my', 'ja', 'ko'] as const,
};

export const ogLocale: Record<string, string> = {
  zh: 'zh_CN',
  en: 'en_US',
  my: 'my',
  ja: 'ja_JP',
  ko: 'ko_KR',
};
