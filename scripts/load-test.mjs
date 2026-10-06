import { spawn } from "node:child_process";
import { performance } from "node:perf_hooks";
import mongoose, { Types } from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

const SHOP_COUNT = Number(process.env.LOAD_SHOPS || 20);
const CUSTOMERS_PER_SHOP = Number(process.env.LOAD_CUSTOMERS_PER_SHOP || 200);
const PRODUCTS_PER_SHOP = Number(process.env.LOAD_PRODUCTS_PER_SHOP || 12);
const CONCURRENCY = Number(process.env.LOAD_CONCURRENCY || 40);
const PORT = Number(process.env.LOAD_PORT || 3210);
const BASE_URL = `http://127.0.0.1:${PORT}`;

function percentile(values, percentage) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * percentage) - 1)];
}

function customerIp(shopIndex, customerIndex) {
  return `10.${shopIndex + 1}.${Math.floor(customerIndex / 254)}.${customerIndex % 254 + 1}`;
}

async function waitForServer(processHandle) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (processHandle.exitCode !== null) throw new Error(`Next server stopped with ${processHandle.exitCode}`);
    try {
      const response = await fetch(BASE_URL, { signal: AbortSignal.timeout(2_000) });
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Next server did not become ready in 30 seconds");
}

async function seedDatabase(database) {
  const now = new Date();
  const categoryId = new Types.ObjectId();
  await database.collection("categories").insertOne({
    _id: categoryId,
    name: "Load Test Jewellery",
    slug: "load-test-jewellery",
    isSystemDefault: true,
    createdAt: now,
    updatedAt: now,
  });

  const shops = [];
  const products = [];
  const subscriptions = [];
  for (let shopIndex = 0; shopIndex < SHOP_COUNT; shopIndex += 1) {
    const shopId = new Types.ObjectId();
    const ownerId = new Types.ObjectId();
    shops.push({
      _id: shopId,
      ownerId,
      name: `Load Test Jewellers ${shopIndex + 1}`,
      slug: `load-shop-${shopIndex + 1}`,
      address: `${shopIndex + 1} Market Road`,
      city: "Test City",
      state: "Gujarat",
      pincode: "380001",
      whatsappNumber: "919999999999",
      businessPhone: "919999999999",
      shortDescription: "Isolated performance test storefront",
      maxProducts: 50,
      maxPhotosPerDay: 30,
      maxVideosPerDay: 2,
      videoUploadsEnabled: false,
      maxVideoDurationSeconds: 30,
      planPrice: 0,
      maxLinkOpens: CUSTOMERS_PER_SHOP + 25,
      currentLinkOpens: 0,
      uniqueVisitorTrackingVersion: 1,
      goldRate22K: 6900,
      goldRate24K: 7500,
      isApproved: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    for (let productIndex = 0; productIndex < PRODUCTS_PER_SHOP; productIndex += 1) {
      products.push({
        _id: new Types.ObjectId(),
        shopId,
        name: `Gold Design ${productIndex + 1}`,
        sku: `LOAD-${shopIndex + 1}-${productIndex + 1}`,
        categoryId,
        description: "Synthetic load-test product",
        images: [],
        videos: [],
        priceType: "FIXED_PRICE",
        price: 45000 + productIndex * 100,
        originalPrice: 50000 + productIndex * 100,
        discountPercentage: 10,
        discountType: "PERCENTAGE",
        discountValue: 10,
        makingCharges: 5000,
        makingChargesDiscountType: "PERCENTAGE",
        makingChargesDiscountValue: 20,
        goldPurity: "22K",
        isPublished: true,
        isFeatured: productIndex === 0,
        isNewArrival: productIndex < 3,
        isBestseller: productIndex === 0,
        isBridalCollection: false,
        likesCount: 0,
        viewsCount: 0,
        sharesCount: 0,
        createdAt: now,
        updatedAt: now,
      });
    }

    for (let customerIndex = 0; customerIndex < CUSTOMERS_PER_SHOP; customerIndex += 1) {
      subscriptions.push({
        _id: new Types.ObjectId(),
        shopId,
        endpoint: `https://push.invalid/${shopIndex}/${customerIndex}`,
        expirationTime: null,
        keys: { p256dh: "synthetic-p256dh", auth: "synthetic-auth" },
        userAgent: "LuxeStore isolated load test",
        failureCount: 0,
        createdAt: now,
        updatedAt: now,
      });
    }
  }

  await database.collection("shops").insertMany(shops);
  await database.collection("products").insertMany(products);
  await database.collection("pushsubscriptions").insertMany(subscriptions);
  await Promise.all([
    database.collection("shops").createIndex({ slug: 1 }, { unique: true }),
    database.collection("shopvisitors").createIndex({ shopId: 1, ipHash: 1 }, { unique: true }),
    database.collection("interactions").createIndex({ userId: 1, targetId: 1, interactionType: 1 }, { unique: true }),
    database.collection("analyticsevents").createIndex({ shopId: 1, eventType: 1, createdAt: -1 }),
    database.collection("pushsubscriptions").createIndex({ shopId: 1, endpoint: 1 }, { unique: true }),
  ]);
  return { shops, products };
}

async function runPool(items, worker, concurrency) {
  let nextIndex = 0;
  const runners = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (nextIndex < items.length) {
      const index = nextIndex;
      nextIndex += 1;
      await worker(items[index], index);
    }
  });
  await Promise.all(runners);
}

async function main() {
  const mongo = await MongoMemoryServer.create({ instance: { dbName: "luxestore_load_test" } });
  const uri = mongo.getUri();
  await mongoose.connect(uri);
  const database = mongoose.connection.db;
  if (!database) throw new Error("Test database did not connect");
  const { shops, products } = await seedDatabase(database);

  const server = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", String(PORT)], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: "production",
      MONGODB_URI: uri,
      NEXTAUTH_SECRET: "isolated-load-test-secret-at-least-32-characters",
      NEXTAUTH_URL: BASE_URL,
      NEXT_PUBLIC_BASE_URL: BASE_URL,
      VERCEL_ENV: "",
      VERCEL_URL: "",
      VERCEL_PROJECT_PRODUCTION_URL: "",
      ABLY_API_KEY: "",
      NEXT_PUBLIC_VAPID_PUBLIC_KEY: "",
      VAPID_PRIVATE_KEY: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let serverErrors = "";
  server.stderr.on("data", (chunk) => { serverErrors += chunk.toString(); });

  const metrics = new Map();
  const record = (name, status, duration) => {
    const current = metrics.get(name) || { total: 0, success: 0, failed: 0, durations: [], statuses: {} };
    current.total += 1;
    if (status >= 200 && status < 400) current.success += 1;
    else current.failed += 1;
    current.durations.push(duration);
    current.statuses[status] = (current.statuses[status] || 0) + 1;
    metrics.set(name, current);
  };

  const request = async (name, url, options = {}) => {
    const started = performance.now();
    try {
      const response = await fetch(`${BASE_URL}${url}`, { ...options, signal: AbortSignal.timeout(20_000) });
      await response.arrayBuffer();
      record(name, response.status, performance.now() - started);
      return response;
    } catch {
      record(name, 0, performance.now() - started);
      return null;
    }
  };

  try {
    await waitForServer(server);
    const customers = [];
    for (let shopIndex = 0; shopIndex < SHOP_COUNT; shopIndex += 1) {
      const shopProducts = products.filter((product) => product.shopId.equals(shops[shopIndex]._id));
      for (let customerIndex = 0; customerIndex < CUSTOMERS_PER_SHOP; customerIndex += 1) {
        customers.push({
          shopIndex,
          customerIndex,
          shop: shops[shopIndex],
          product: shopProducts[customerIndex % shopProducts.length],
          ip: customerIp(shopIndex, customerIndex),
        });
      }
    }

    const started = performance.now();
    await runPool(customers, async ({ shop, product, ip }) => {
      const headers = { "x-vercel-forwarded-for": ip, "user-agent": "LuxeStore-Load-Test/1.0" };
      await request("storefront", `/shop/${shop.slug}`, { headers });
      await request("product-page", `/shop/${shop.slug}/product/${product._id}`, { headers });
      await request("shop-analytics", "/api/analytics/track", {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({ shopId: shop._id.toString(), eventType: "SHOP_VIEW" }),
      });
      await request("product-analytics", "/api/analytics/track", {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({ shopId: shop._id.toString(), targetId: product._id.toString(), eventType: "PRODUCT_VIEW" }),
      });
      await request("product-like", "/api/interactions", {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({
          shopId: shop._id.toString(),
          targetId: product._id.toString(),
          targetType: "PRODUCT",
          interactionType: "LIKE",
        }),
      });
    }, CONCURRENCY);
    const elapsedMs = performance.now() - started;

    const [visitorCount, analyticsCount, interactionCount, subscriptionCount, shopCounters, productTotals] = await Promise.all([
      database.collection("shopvisitors").countDocuments(),
      database.collection("analyticsevents").countDocuments(),
      database.collection("interactions").countDocuments(),
      database.collection("pushsubscriptions").countDocuments(),
      database.collection("shops").find({}, { projection: { currentLinkOpens: 1 } }).toArray(),
      database.collection("products").aggregate([
        { $group: { _id: null, views: { $sum: "$viewsCount" }, likes: { $sum: "$likesCount" } } },
      ]).toArray(),
    ]);

    const endpointResults = Object.fromEntries([...metrics.entries()].map(([name, value]) => [name, {
      requests: value.total,
      success: value.success,
      failed: value.failed,
      p50Ms: Math.round(percentile(value.durations, 0.5)),
      p95Ms: Math.round(percentile(value.durations, 0.95)),
      p99Ms: Math.round(percentile(value.durations, 0.99)),
      maxMs: Math.round(Math.max(...value.durations)),
      statuses: value.statuses,
    }]));
    const expectedCustomers = SHOP_COUNT * CUSTOMERS_PER_SHOP;
    const totalRequests = [...metrics.values()].reduce((sum, value) => sum + value.total, 0);
    const failedRequests = [...metrics.values()].reduce((sum, value) => sum + value.failed, 0);
    const totals = productTotals[0] || { views: 0, likes: 0 };
    const invariants = {
      visitors: { expected: expectedCustomers, actual: visitorCount, pass: visitorCount === expectedCustomers },
      analytics: { expected: expectedCustomers * 2, actual: analyticsCount, pass: analyticsCount === expectedCustomers * 2 },
      interactions: { expected: expectedCustomers, actual: interactionCount, pass: interactionCount === expectedCustomers },
      subscriptions: { expected: expectedCustomers, actual: subscriptionCount, pass: subscriptionCount === expectedCustomers },
      productViews: { expected: expectedCustomers, actual: totals.views, pass: totals.views === expectedCustomers },
      productLikes: { expected: expectedCustomers, actual: totals.likes, pass: totals.likes === expectedCustomers },
      perShopVisitorCounters: {
        expected: CUSTOMERS_PER_SHOP,
        minimum: Math.min(...shopCounters.map((shop) => shop.currentLinkOpens)),
        maximum: Math.max(...shopCounters.map((shop) => shop.currentLinkOpens)),
        pass: shopCounters.every((shop) => shop.currentLinkOpens === CUSTOMERS_PER_SHOP),
      },
    };

    console.log(JSON.stringify({
      scenario: { shops: SHOP_COUNT, customersPerShop: CUSTOMERS_PER_SHOP, customers: expectedCustomers, products: products.length, concurrency: CONCURRENCY },
      summary: {
        totalRequests,
        failedRequests,
        elapsedSeconds: Math.round(elapsedMs / 100) / 10,
        requestsPerSecond: Math.round(totalRequests / (elapsedMs / 1000) * 10) / 10,
      },
      endpoints: endpointResults,
      invariants,
      serverErrors: serverErrors.trim().split("\n").filter(Boolean).slice(-10),
    }, null, 2));

    if (failedRequests > 0 || Object.values(invariants).some((invariant) => !invariant.pass)) process.exitCode = 1;
  } finally {
    server.kill("SIGTERM");
    await mongoose.disconnect();
    await mongo.stop();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
