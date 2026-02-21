const { MongoMemoryServer } = require('mongodb-memory-server');

module.exports = async () => {
  const mongod = await MongoMemoryServer.create();
  process.env.MONGO_TEST_URI = mongod.getUri();
  // Store instance for teardown
  globalThis.__MONGOD__ = mongod;
};
