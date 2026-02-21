const mongoose = require('mongoose');

/**
 * Connect to the in-memory MongoDB instance before all tests in a file.
 */
async function connectDB() {
  const uri = process.env.MONGO_TEST_URI;
  if (!uri) throw new Error('MONGO_TEST_URI not set. Is globalSetup running?');
  await mongoose.connect(uri);
}

/**
 * Drop all collections and close connection after all tests in a file.
 */
async function disconnectDB() {
  const collections = await mongoose.connection.db.collections();
  for (const collection of collections) {
    await collection.drop().catch(() => {});
  }
  await mongoose.connection.close();
}

/**
 * Clear all collections between tests (but keep connection open).
 */
async function clearDB() {
  const collections = await mongoose.connection.db.collections();
  for (const collection of collections) {
    await collection.deleteMany({});
  }
}

module.exports = { connectDB, disconnectDB, clearDB };
