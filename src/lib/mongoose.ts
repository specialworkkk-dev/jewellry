import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/jewellery-saas';

function boundedInteger(value: string | undefined, fallback: number, min: number, max: number) {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

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
      // Every Vercel function instance owns its own pool. A conservative default
      // prevents a traffic burst from multiplying into hundreds of Atlas
      // connections, while remaining configurable for a dedicated server.
      maxPoolSize: boundedInteger(process.env.MONGODB_MAX_POOL_SIZE, 10, 2, 50),
      minPoolSize: 0,
      maxIdleTimeMS: boundedInteger(process.env.MONGODB_MAX_IDLE_TIME_MS, 60_000, 10_000, 300_000),
      serverSelectionTimeoutMS: boundedInteger(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS, 5_000, 1_000, 30_000),
      socketTimeoutMS: boundedInteger(process.env.MONGODB_SOCKET_TIMEOUT_MS, 15_000, 5_000, 60_000),
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
