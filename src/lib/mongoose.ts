import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/jewellery-saas';

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

const globalWithMongoose = globalThis as typeof globalThis & {
  mongooseCache?: MongooseCache;
};

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 */
const cached: MongooseCache = globalWithMongoose.mongooseCache
  ?? (globalWithMongoose.mongooseCache = { conn: null, promise: null });

async function connectToDatabase() {
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }
  if (mongoose.connection.readyState === 0) {
    cached.conn = null;
    cached.promise = null;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      // Keep serverless instances economical while still allowing parallel page,
      // analytics and interaction queries during traffic bursts.
      maxPoolSize: 50,
      minPoolSize: 0,
      maxIdleTimeMS: 60_000,
      serverSelectionTimeoutMS: 5_000,
      socketTimeoutMS: 15_000,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((connection) => {
      return connection;
    });
  }
  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    // Allow a later serverless invocation to retry after a transient connection failure.
    cached.promise = null;
    cached.conn = null;
    throw error;
  }
}

export default connectToDatabase;
