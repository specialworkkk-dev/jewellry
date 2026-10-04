import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const uri = process.env.MONGODB_URI;

async function check() {
  if (!uri) {
    console.log("No MONGODB_URI");
    return;
  }
  await mongoose.connect(uri);
  console.log("Connected to MongoDB.");

  const shops = mongoose.connection.collection('shops');
  const allShops = await shops.find({}).toArray();
  console.log("Shops in DB:", allShops);

  const users = mongoose.connection.collection('users');
  const allUsers = await users.find({}).toArray();
  console.log("Users in DB:", allUsers);

  process.exit(0);
}

check();
