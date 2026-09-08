const app = require('./app');
const { env } = require('./config');
const { connectDB } = require('./config/db');

(async () => {
  try {
    await connectDB();
    app.listen(env.PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`API running on http://localhost:${env.PORT} (${env.NODE_ENV})`);
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to start server:', err.message);
    process.exit(1);
  }
})();

module.exports = app;
