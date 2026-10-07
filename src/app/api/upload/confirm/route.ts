import { NextResponse } from "next/server";
import { getVerifiedOwnerTenant } from "@/lib/tenant";
import { isRecord } from "@/lib/validation";
import { checkRateLimit, requestClientId } from "@/lib/rate-limit";
import { deleteR2Keys, readObjectHead, shopOwnedR2Keys } from "@/lib/r2";
import connectToDatabase from "@/lib/mongoose";
import MediaReservation from "@/models/MediaReservation";
import { markReservationConfirmed, rejectReservation } from "@/lib/media-quota";
import { SNIFF_BYTES, verifyUploadedObject } from "@/lib/media-sniff";
import { Types } from "mongoose";

/**
 * Post-upload verification for presigned uploads. The server reads the stored
 * object's size and first bytes from R2; mismatching objects are deleted and
 * their quota unit returned. Only confirmed keys can be attached to content.
 */
export async function POST(req: Request) {
  try {
    const tenant = await getVerifiedOwnerTenant();
    if (!tenant) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { shopId } = tenant;

    const rate = await checkRateLimit(`upload-confirm:${shopId}:${requestClientId(req)}`, 120, 60_000);
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many requests. Please wait a moment." }, {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSeconds) },
      });
    }

    const body: unknown = await req.json().catch(() => null);
    const key = isRecord(body) && typeof body.key === "string" ? body.key : "";
    if (!key || shopOwnedR2Keys(shopId, [`${process.env.NEXT_PUBLIC_R2_DEV_URL?.replace(/\/$/, "")}/${key}`])[0] !== key) {
      return NextResponse.json({ error: "Invalid upload key" }, { status: 400 });
    }

    await connectToDatabase();
    const reservation = await MediaReservation.findOne({ shopId: new Types.ObjectId(shopId), key }).lean();
    if (!reservation) return NextResponse.json({ error: "Unknown upload" }, { status: 404 });
    if (reservation.state === "confirmed") return NextResponse.json({ confirmed: true });
    if (reservation.state !== "pending") {
      return NextResponse.json({ error: "Upload expired or was rejected. Please upload again." }, { status: 410 });
    }

    const stored = await readObjectHead(key, SNIFF_BYTES);
    if (!stored) {
      // Not uploaded (yet); keep the reservation so the client can retry until it expires.
      return NextResponse.json({ error: "Uploaded file not found" }, { status: 404 });
    }
    const check = verifyUploadedObject({
      declaredType: reservation.contentType,
      declaredLength: reservation.contentLength,
      actualLength: stored.length,
      head: stored.head,
    });
    if (!check.ok) {
      await rejectReservation(shopId, key);
      await deleteR2Keys([key]);
      return NextResponse.json({ error: check.reason }, { status: 422 });
    }
    if (!(await markReservationConfirmed(shopId, key))) {
      return NextResponse.json({ error: "Upload expired. Please upload again." }, { status: 410 });
    }
    return NextResponse.json({ confirmed: true });
  } catch (error: unknown) {
    console.error("Upload confirm error:", error instanceof Error ? error.message : "unknown error");
    return NextResponse.json({ error: "Unable to verify upload" }, { status: 500 });
  }
}
