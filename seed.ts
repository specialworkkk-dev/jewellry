import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
dotenv.config({ path: '.env.local' });

const uri = process.env.MONGODB_URI;

async function seed() {
  if (!uri) return;
  await mongoose.connect(uri);

  const users = mongoose.connection.collection('users');
  const shops = mongoose.connection.collection('shops');

  const existing = await shops.findOne({ slug: 'demo' });
  if (existing) {
    console.log("Demo shop already exists!");
    process.exit(0);
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('password123', salt);

  const userId = new mongoose.Types.ObjectId();
  const shopId = new mongoose.Types.ObjectId();

  await users.insertOne({
    _id: userId,
    name: "Demo Owner",
    email: "demo@example.com",
    mobile: "1234567890",
    passwordHash: passwordHash,
    role: "SHOP_OWNER",
    shopId: shopId,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  await shops.insertOne({
    _id: shopId,
    ownerId: userId,
    name: "Demo Shop",
    slug: "demo",
    address: "123 Demo Street",
    city: "Demo City",
    state: "Demo State",
    pincode: "123456",
    whatsappNumber: "1234567890",
    businessPhone: "1234567890",
    isApproved: true,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  console.log("Successfully created Demo Shop and Demo User!");
  process.exit(0);
}

seed();
