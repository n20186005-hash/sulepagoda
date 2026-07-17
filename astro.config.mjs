import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://sulepagoda.com',
  output: 'static',
  i18n: {
    defaultLocale: 'zh',
    locales: ['zh', 'en', 'my', 'ja', 'ko'],
    routing: {
      prefixDefaultLocale: true,
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
});
