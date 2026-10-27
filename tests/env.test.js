const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { loadEnv } = require('../config/env');

test('trims dotenv values from a CRLF file while preserving quoted comments', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'chat-ships-env-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const envPath = path.join(directory, '.env');
  fs.writeFileSync(envPath, [
    'ADMIN_PASSWORD=sample-password   ',
    'CHAT_MODE=" dev " # trailing comment',
    'BANNED_WORDS="word#tag" # trailing comment',
  ].join('\r\n'), 'utf8');

  const environment = loadEnv({ envPath, target: {} });

  assert.equal(environment.ADMIN_PASSWORD, 'sample-password');
  assert.equal(environment.CHAT_MODE, 'dev');
  assert.equal(environment.BANNED_WORDS, 'word#tag');
});

test('trims inherited password values without replacing them from the dotenv file', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'chat-ships-env-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const envPath = path.join(directory, '.env');
  fs.writeFileSync(envPath, 'ADMIN_PASSWORD=file-value\r\n', 'utf8');

  const environment = loadEnv({ envPath, target: { ADMIN_PASSWORD: ' inherited-value  ' } });

  assert.equal(environment.ADMIN_PASSWORD, 'inherited-value');
});
