import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
async function run() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const result = await mongoose.connection.collection('products').updateMany({}, { $set: { isPublished: true } });
  console.log(`Published ${result.modifiedCount} products.`);
  process.exit(0);
}
run();
