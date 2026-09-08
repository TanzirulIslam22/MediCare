const mongoose = require('mongoose');
const { env } = require('./index');

async function connectDB() {
  mongoose.set('strictQuery', true);
  await mongoose.connect(env.MONGODB_URI, {
    serverSelectionTimeoutMS: 10000,
  });
  if (env.NODE_ENV !== 'test') {
    // eslint-disable-next-line no-console
    console.log(`MongoDB connected: ${mongoose.connection.host}`);
  }
  return mongoose.connection;
}

async function disconnectDB() {
  await mongoose.disconnect();
}

module.exports = { connectDB, disconnectDB };
