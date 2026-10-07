import "server-only";

import { Types } from "mongoose";
import connectToDatabase from "@/lib/mongoose";
import Product from "@/models/Product";
import Post from "@/models/Post";
import Story from "@/models/Story";
import Advertisement from "@/models/Advertisement";
import Shop from "@/models/Shop";
import MediaReservation from "@/models/MediaReservation";
import { deleteR2Keys, shopOwnedR2Keys } from "@/lib/r2";
import { subtractKeys } from "@/lib/media-sniff";

/**
 * Deletes R2 objects for `urls` unless another product/post/story/ad/branding
 * entry of the same shop still references them. Call AFTER the referencing
 * document was updated/deleted. Best-effort; never throws.
 */
export async function deleteUnreferencedShopObjects(shopId: string, urls: unknown[]): Promise<void> {
  try {
    const candidates = shopOwnedR2Keys(shopId, urls);
    if (candidates.length === 0) return;
    await connectToDatabase();
    const shopObjectId = new Types.ObjectId(shopId);
    // Match on both the public URL and the raw string forms stored in documents.
    const base = process.env.NEXT_PUBLIC_R2_DEV_URL?.replace(/\/$/, "") ?? "";
    const candidateUrls = candidates.map((key) => `${base}/${key}`);
    const [products, posts, stories, ads, shop] = await Promise.all([
      Product.find({ shopId: shopObjectId, $or: [{ images: { $in: candidateUrls } }, { videos: { $in: candidateUrls } }] })
        .select("images videos").lean(),
      Post.find({ shopId: shopObjectId, mediaUrls: { $in: candidateUrls } }).select("mediaUrls").lean(),
      Story.find({ shopId: shopObjectId, mediaUrl: { $in: candidateUrls } }).select("mediaUrl").lean(),
      Advertisement.find({ shopId: shopObjectId, imageUrl: { $in: candidateUrls } }).select("imageUrl").lean(),
      Shop.findById(shopObjectId).select("logoUrl coverUrl").lean(),
    ]);
    const referencedUrls: unknown[] = [
      ...products.flatMap((doc) => [...(doc.images ?? []), ...(doc.videos ?? [])]),
      ...posts.flatMap((doc) => doc.mediaUrls ?? []),
      ...stories.map((doc) => doc.mediaUrl),
      ...ads.map((doc) => doc.imageUrl),
      shop?.logoUrl,
      shop?.coverUrl,
    ];
    const referenced = shopOwnedR2Keys(shopId, referencedUrls);
    const deletable = subtractKeys(candidates, referenced);
    if (deletable.length === 0) return;
    await deleteR2Keys(deletable);
    await MediaReservation.deleteMany({ shopId: shopObjectId, key: { $in: deletable } });
  } catch (error) {
    console.error("Media cleanup failed:", error instanceof Error ? error.message : "unknown error");
  }
}
