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

  const salt = await bcrypt.genSalt(10);

  const existingDemo = await users.findOne({ email: 'demo@example.com' });
  if (!existingDemo) {
    const userId = new mongoose.Types.ObjectId();
    const shopId = new mongoose.Types.ObjectId();

    const passwordHash = await bcrypt.hash('password123', salt);

    await users.insertOne({
      _id: userId,
      name: "Demo Owner",
      email: "demo@example.com",
      mobile: "1234567890",
      passwordHash,
      role: "SHOP_OWNER",
      shopId,
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
      isActive: true,
      maxProducts: 50,
      maxPhotosPerDay: 30,
      maxVideosPerDay: 2,
      planPrice: 0,
      maxLinkOpens: 500,
      currentLinkOpens: 0,
      uniqueVisitorTrackingVersion: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    console.log("Created Demo Owner and Demo Shop");
  }

  const requestedAdminUsername = process.env.ADMIN_SEED_USERNAME?.trim();
  const requestedAdminPassword = process.env.ADMIN_SEED_PASSWORD;
  if (requestedAdminUsername && requestedAdminPassword) {
    const username = requestedAdminUsername.toLowerCase();
    const now = new Date();
    await users.updateOne(
      { username },
      {
        $set: {
          name: requestedAdminUsername,
          username,
          mobile: '0000000000',
          passwordHash: await bcrypt.hash(requestedAdminPassword, salt),
          role: 'SUPER_ADMIN',
          updatedAt: now,
        },
        $setOnInsert: { createdAt: now },
      },
      { upsert: true },
    );
    console.log('Platform admin account seeded securely.');
  } else {
    console.log('Skipped admin seed: provide ADMIN_SEED_USERNAME and ADMIN_SEED_PASSWORD.');
  }

  const settings = mongoose.connection.collection('platformsettings');
  const existingSettings = await settings.findOne({ key: 'default' });
  if (!existingSettings) {
    await settings.insertOne({
      key: 'default',
      platformName: 'LuxeStore SaaS',
      supportEmail: 'support@luxestore.com',
      supportPhone: '+91 98765 43210',
      defaultMaxProducts: 50,
      defaultMaxLinkOpens: 500,
      allowPublicRegistration: true,
      allowAutoApproval: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  process.exit(0);
}

seed();
