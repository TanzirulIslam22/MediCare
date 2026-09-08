const fs = require('fs');
const path = require('path');

function getClientIp(req) {
  return req.ip || req.connection?.remoteAddress || 'unknown';
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function rootDir() {
  return path.resolve(__dirname, '..', '..');
}

module.exports = { getClientIp, ensureDir, rootDir };
