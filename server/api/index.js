const { connectDB } = require('../src/config/db');
const app = require('../src/app');

let ready = null;

module.exports = async (req, res) => {
  if (!ready) {
    ready = connectDB().catch((err) => {
      ready = null;
      throw err;
    });
  }
  await ready;
  return app(req, res);
};