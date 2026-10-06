import "server-only";

import { revalidateTag } from "next/cache";

export function invalidatePublicStoreCache() {
  revalidateTag("public-store", { expire: 0 });
}
