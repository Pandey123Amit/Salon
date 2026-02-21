const mongoose = require('mongoose');
const logger = require('../utils/logger');
const env = require('./env');

const connectDB = async () => {
  const MAX_RETRIES = 5;
  let retries = 0;

  while (retries < MAX_RETRIES) {
    try {
      const conn = await mongoose.connect(env.mongoUri);
      logger.info(`MongoDB connected: ${conn.connection.host}`);
      return conn;
    } catch (err) {
      retries++;
      logger.error(`MongoDB connection attempt ${retries} failed: ${err.message}`);
      if (retries === MAX_RETRIES) {
        logger.error('Max retries reached. Exiting.');
        process.exit(1);
      }
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
};

module.exports = connectDB;
