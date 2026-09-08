const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { env } = require('../config');

function signAccessToken(payload) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    algorithm: 'HS256',
  });
}

function signRefreshToken(payload) {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: env.JWT_REFRESH_EXPIRES_IN,
    algorithm: 'HS256',
  });
}

function verifyAccessToken(token) {
  return jwt.verify(token, env.JWT_ACCESS_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, env.JWT_REFRESH_SECRET);
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateRandomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

module.exports = {
  signAccessToken,
  signRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  hashToken,
  generateRandomToken,
};
