import { S3Client, PutBucketCorsCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const required = ["R2_ACCOUNT_ID", "R2_BUCKET_NAME", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "NEXTAUTH_URL"];
const missing = required.filter((name) => !process.env[name]);
if (missing.length > 0) throw new Error(`Missing environment variables: ${missing.join(", ")}`);

const allowedOrigin = new URL(process.env.NEXTAUTH_URL).origin;
const s3 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

const command = new PutBucketCorsCommand({
  Bucket: process.env.R2_BUCKET_NAME,
  CORSConfiguration: {
    CORSRules: [{
      AllowedHeaders: ["content-type"],
      AllowedMethods: ["GET", "PUT", "HEAD"],
      AllowedOrigins: [allowedOrigin],
      ExposeHeaders: ["ETag"],
      MaxAgeSeconds: 3600,
    }],
  },
});

try {
  await s3.send(command);
  console.log(`R2 CORS configured for ${allowedOrigin}`);
} catch (error) {
  console.error("Error applying R2 CORS:", error);
  process.exitCode = 1;
}
