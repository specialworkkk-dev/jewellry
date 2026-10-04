import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
async function run() {
  await mongoose.connect(process.env.MONGODB_URI!);
  await mongoose.connection.collection('users').deleteMany({ shopId: { $exists: false } });
  console.log("Deleted orphaned users.");
  process.exit(0);
}
run();
