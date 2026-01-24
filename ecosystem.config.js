const fs = require('fs');
const path = require('path');

function loadEnv(filePath) {
  try {
    const envPath = path.resolve(__dirname, filePath);
    if (!fs.existsSync(envPath)) return {};
    const content = fs.readFileSync(envPath, 'utf8');
    const env = {};
    content.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        const key = match[1].trim();
        const value = match[2].trim().replace(/^['"](.*)['"]$/, '$1');
        if (key && !key.startsWith('#')) {
          env[key] = value;
        }
      }
    });
    return env;
  } catch (e) {
    console.error('Failed to load env from', filePath, e);
    return {};
  }
}

module.exports = {
  apps: [
    {
      name: 'avith-api',
      script: 'apps/api/dist/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
        ...loadEnv('apps/api/.env')
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000,
        ...loadEnv('apps/api/.env')
      }
    },
    {
      name: 'avith-web',
      script: 'apps/web/.next/standalone/apps/web/server.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        ...loadEnv('apps/web/.env')
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        ...loadEnv('apps/web/.env')
      }
    }
  ]
};
