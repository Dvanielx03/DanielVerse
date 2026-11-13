// @ts-check
import { defineConfig } from 'astro/config';

// Publicado en GitHub Pages: https://dvanielx03.github.io/DanielVerse/
// Español en la raíz e inglés en /en/.
export default defineConfig({
  site: 'https://dvanielx03.github.io',
  base: '/DanielVerse',
  i18n: {
    locales: ['es', 'en'],
    defaultLocale: 'es',
  },
});
