// Debug helper: scratch copy + in-memory mongo + dev server, left running (Ctrl-C / fuser -k 3115/tcp to stop).
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { prepareWorkdir, startMongo, startServer, MONGO_URI, BASE } from './lib.mjs';
prepareWorkdir(); await startMongo();
await mongoose.connect(MONGO_URI); const db = mongoose.connection.db; const now = new Date();
for (const [slug, name] of [['rings', 'Rings'], ['necklaces', 'Necklaces']]) await db.collection('categories').insertOne({ name, slug, isSystemDefault: true, createdAt: now, updatedAt: now });
await db.collection('users').insertOne({ name: 'E2E Super', username: 'e2eadmin', mobile: '9999999999', passwordHash: await bcrypt.hash('AdminPass#12345', 10), role: 'SUPER_ADMIN', createdAt: now, updatedAt: now });
await startServer(); console.log('READY', BASE);
setInterval(() => {}, 1 << 30);
