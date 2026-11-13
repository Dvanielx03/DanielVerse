// @ts-check
import { defineConfig } from 'astro/config';

// Español en la raíz e inglés en /en/.
export default defineConfig({
  i18n: {
    locales: ['es', 'en'],
    defaultLocale: 'es',
  },
});
