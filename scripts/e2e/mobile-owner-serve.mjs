// Owner mobile-audit harness: scratch copy + in-memory mongo + dev server + seeded owner/products. Left running.
// env: E2E_PORT E2E_MONGO_PORT E2E_WORK (see lib.mjs)
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { prepareWorkdir, startMongo, startServer, MONGO_URI, BASE, Client } from './lib.mjs';
prepareWorkdir(); await startMongo();
await mongoose.connect(MONGO_URI); const db = mongoose.connection.db; const now = new Date();
const cats = {};
for (const [slug, name] of [['rings', 'Rings'], ['necklaces', 'Necklaces'], ['earrings', 'Earrings']]) cats[slug] = (await db.collection('categories').insertOne({ name, slug, isSystemDefault: true, createdAt: now, updatedAt: now })).insertedId;
await db.collection('platformsettings').insertOne({ key: 'default', allowAutoApproval: true, allowPublicRegistration: true, defaultMaxProducts: 50, defaultMaxLinkOpens: 500, createdAt: now, updatedAt: now });
await startServer();
const r = await new Client('reg').post('/api/auth/register', { name: 'Ramesh Kumar Venkataraman', username: 'mobowner', email: 'mob@example.test', mobile: '9812345678', password: 'OwnerPass#12345', shopName: 'Shree Lakshmi Jewellers And Diamonds', city: 'Surat', state: 'GJ' });
console.log('register', r.status, r.text.slice(0, 150));
const shop = await db.collection('shops').findOne({});
await db.collection('shops').updateOne({ _id: shop._id }, { $set: { status: 'APPROVED', isActive: true } });
const names = ['Sculpted Gold Stud Earrings With Diamond Accents', 'Ring', 'Royal Heritage Polki Kundan Bridal Necklace Set With Matching Maang Tikka', 'Pendant', 'Extraordinarilylongunbrokenproductnamewithoutanyspacesatalltotesttheoverflowbehaviour', 'Rose Gold Band', 'Temple Jewellery Lakshmi Haar 22K', 'Solitaire Engagement Ring', 'Antique Jhumka Earrings', 'Diamond Tennis Bracelet', 'Mangalsutra Black Bead Chain', 'Navratna Ring'];
const types = ['FIXED_PRICE', 'STARTING_FROM', 'PRICE_ON_REQUEST', 'CONTACT_FOR_PRICE'];
const docs = names.map((name, i) => ({ shopId: shop._id, name, sku: i % 3 === 0 ? 'SKU-VERYLONG-GOLD-EARRING-DIAMOND-0001234567890' : `SKU${i}`, categoryId: cats.rings, description: 'd', images: i % 2 === 0 ? ['/icon-512.png'] : [], videos: [], priceType: types[i % 4], price: i % 4 > 1 ? undefined : (i === 0 ? 1245000 : i === 2 ? 98765432 : 1500 + i), isPublished: i % 3 !== 1, isFeatured: false, isNewArrival: false, isBestseller: false, isBridalCollection: false, likesCount: 0, viewsCount: 0, sharesCount: 0, createdAt: new Date(now - i * 1000), updatedAt: now }));
await db.collection('products').insertMany(docs);
console.log('READY', BASE, 'shop', shop._id.toString());
setInterval(() => {}, 1 << 30);
