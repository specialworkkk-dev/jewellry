import { spawn } from "node:child_process";
import bcrypt from "bcryptjs";
import mongoose, { Types } from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

const PORT = Number(process.env.AUTH_TEST_PORT || 3220);
const BASE_URL = `http://127.0.0.1:${PORT}`;
const USERNAME = "owner-session-test";
const PASSWORD = "OwnerSession@Test123";
const AUTH_SECRET = "isolated-owner-session-test-secret-with-more-than-32-characters";

function mergeCookies(jar, response) {
  for (const header of response.headers.getSetCookie()) {
    const pair = header.split(";", 1)[0];
    const separator = pair.indexOf("=");
    if (separator > 0) jar.set(pair.slice(0, separator), pair.slice(separator + 1));
  }
}

function cookieHeader(jar) {
  return [...jar.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
}

function startServer(mongoUri) {
  const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", String(PORT)], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: "production",
      MONGODB_URI: mongoUri,
      NEXTAUTH_SECRET: AUTH_SECRET,
      NEXTAUTH_URL: BASE_URL,
      NEXT_PUBLIC_BASE_URL: BASE_URL,
      VERCEL_ENV: "",
      VERCEL_URL: "",
      VERCEL_PROJECT_PRODUCTION_URL: "",
      ABLY_API_KEY: "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let errors = "";
  child.stderr.on("data", (chunk) => { errors += chunk.toString(); });
  return { child, errors: () => errors };
}

async function waitForServer(child) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`Server stopped with ${child.exitCode}`);
    try {
      const response = await fetch(BASE_URL, { signal: AbortSignal.timeout(2_000) });
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error("Server did not start");
}

async function stopServer(child) {
  if (child.exitCode !== null) return;
  child.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => child.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 5_000)),
  ]);
}

async function main() {
  const mongo = await MongoMemoryServer.create({ instance: { dbName: "owner_session_test" } });
  await mongoose.connect(mongo.getUri());
  const database = mongoose.connection.db;
  if (!database) throw new Error("Test database unavailable");

  const ownerId = new Types.ObjectId();
  const shopId = new Types.ObjectId();
  const now = new Date();
  await database.collection("users").insertOne({
    _id: ownerId,
    name: "Session Test Owner",
    username: USERNAME,
    email: "session-owner@example.test",
    mobile: "919999999999",
    passwordHash: await bcrypt.hash(PASSWORD, 10),
    role: "SHOP_OWNER",
    shopId,
    createdAt: now,
    updatedAt: now,
  });
  await database.collection("shops").insertOne({
    _id: shopId,
    ownerId,
    name: "Session Test Jewellers",
    slug: "session-test-jewellers",
    whatsappNumber: "919999999999",
    maxProducts: 50,
    maxPhotosPerDay: 30,
    maxVideosPerDay: 2,
    videoUploadsEnabled: false,
    maxVideoDurationSeconds: 30,
    planPrice: 0,
    maxLinkOpens: 500,
    currentLinkOpens: 0,
    uniqueVisitorTrackingVersion: 1,
    isApproved: true,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });

  const jar = new Map();
  let firstServer;
  let secondServer;
  try {
    firstServer = startServer(mongo.getUri());
    await waitForServer(firstServer.child);

    const csrfResponse = await fetch(`${BASE_URL}/api/auth/csrf`);
    mergeCookies(jar, csrfResponse);
    const { csrfToken } = await csrfResponse.json();
    const loginResponse = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: "POST",
      redirect: "manual",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        cookie: cookieHeader(jar),
      },
      body: new URLSearchParams({
        csrfToken,
        username: USERNAME,
        email: USERNAME,
        password: PASSWORD,
        callbackUrl: `${BASE_URL}/dashboard`,
        json: "true",
      }),
    });
    const loginSetCookies = loginResponse.headers.getSetCookie();
    mergeCookies(jar, loginResponse);
    const sessionCookie = loginSetCookies.find((header) => header.includes("next-auth.session-token="));
    if (!sessionCookie) throw new Error("Login did not issue a session cookie");

    const beforeClose = await fetch(`${BASE_URL}/api/auth/session`, {
      headers: { cookie: cookieHeader(jar) },
    }).then((response) => response.json());
    if (beforeClose?.user?.role !== "SHOP_OWNER") throw new Error("Owner session missing before close");

    const dashboardBeforeClose = await fetch(`${BASE_URL}/dashboard`, {
      redirect: "manual",
      headers: { cookie: cookieHeader(jar) },
    });
    if (dashboardBeforeClose.status !== 200) throw new Error(`Dashboard before close returned ${dashboardBeforeClose.status}`);

    await stopServer(firstServer.child);
    secondServer = startServer(mongo.getUri());
    await waitForServer(secondServer.child);

    const afterReopen = await fetch(`${BASE_URL}/api/auth/session`, {
      headers: { cookie: cookieHeader(jar) },
    }).then((response) => response.json());
    const dashboardAfterReopen = await fetch(`${BASE_URL}/dashboard?source=pwa`, {
      redirect: "manual",
      headers: { cookie: cookieHeader(jar) },
    });

    const result = {
      loginStatus: loginResponse.status,
      sessionBeforeClose: beforeClose?.user?.role === "SHOP_OWNER",
      dashboardBeforeClose: dashboardBeforeClose.status,
      sessionAfterReopen: afterReopen?.user?.role === "SHOP_OWNER",
      dashboardAfterReopen: dashboardAfterReopen.status,
      persistentCookie: /Max-Age=604800/i.test(sessionCookie) && /Expires=/i.test(sessionCookie),
      secureCookie: /Secure/i.test(sessionCookie),
      httpOnlyCookie: /HttpOnly/i.test(sessionCookie),
      sameSiteLax: /SameSite=Lax/i.test(sessionCookie),
      serverErrors: `${firstServer.errors()}\n${secondServer.errors()}`.trim().split("\n").filter(Boolean),
    };
    console.log(JSON.stringify(result, null, 2));
    if (!result.sessionAfterReopen || result.dashboardAfterReopen !== 200 || !result.persistentCookie || result.serverErrors.length) {
      process.exitCode = 1;
    }
  } finally {
    if (firstServer) await stopServer(firstServer.child);
    if (secondServer) await stopServer(secondServer.child);
    await mongoose.disconnect();
    await mongo.stop();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
