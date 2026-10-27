const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');

function parseEnv(source) {
  const parsed = dotenv.parse(source);
  return Object.fromEntries(Object.entries(parsed).map(([key, value]) => [key, String(value).trim()]));
}

function loadEnv({ envPath = path.resolve(__dirname, '..', '.env'), target = process.env } = {}) {
  const parsed = fs.existsSync(envPath) ? parseEnv(fs.readFileSync(envPath)) : {};
  for (const [key, value] of Object.entries(parsed)) {
    target[key] = target[key] === undefined ? value : String(target[key]).trim();
  }
  if (target.ADMIN_PASSWORD !== undefined) target.ADMIN_PASSWORD = String(target.ADMIN_PASSWORD).trim();
  return target;
}

module.exports = { loadEnv, parseEnv };
