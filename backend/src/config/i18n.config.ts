import { I18nOptions } from 'nestjs-i18n';
import { join } from 'path';
import { existsSync } from 'fs';

export const i18nConfig = (): I18nOptions => {
  // Try multiple possible paths for i18n directory
  // After build, __dirname points to dist/config, so we need to check both src and dist locations
  // Docker copies i18n to ./dist/i18n according to Dockerfile
  const possiblePaths = [
    join(__dirname, '../i18n'),  // After build: dist/config -> dist/i18n (Docker production)
    join(__dirname, '../../src/i18n'),  // Local development (before build): src/config -> src/i18n
    join(__dirname, '../../i18n'),  // Root level i18n
    '/app/dist/i18n',  // Docker production (absolute path)
    '/app/src/i18n',  // Docker development (absolute path)
    join(process.cwd(), 'dist/i18n'),  // Alternative production
    join(process.cwd(), 'src/i18n'),  // Alternative local
    join(process.cwd(), 'i18n'),  // Root level
  ];

  let i18nPath: string | null = null;
  
  // Find first existing path
  for (const path of possiblePaths) {
    if (existsSync(path)) {
      i18nPath = path;
      console.log(`✅ Found i18n path: ${i18nPath}`);
      break;
    }
  }
  
  // If no path found, use the most likely one based on __dirname
  // After build, use dist/i18n; otherwise use src/i18n
  if (!i18nPath) {
    if (__dirname.includes('dist')) {
      // We're in the built version (dist/config)
      i18nPath = join(__dirname, '../i18n');
    } else {
      // We're in source (src/config)
      i18nPath = join(__dirname, '../../src/i18n');
    }
    console.warn(`⚠️  i18n path not found in any expected location, using fallback: ${i18nPath}`);
    console.warn(`   __dirname: ${__dirname}`);
    console.warn(`   process.cwd(): ${process.cwd()}`);
  }
  
  return {
    fallbackLanguage: 'en',
    loaderOptions: {
      path: i18nPath!,
      watch: false, // Disable watch in Docker/production
    },
    resolvers: [
      {
        resolve: (ctx: any) => {
          return ctx.request?.headers?.['accept-language']?.split(',')?.[0]?.split('-')?.[0] || 'en';
        },
      },
    ],
  };
};

