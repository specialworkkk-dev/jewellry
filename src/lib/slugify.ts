import Shop from '@/models/Shop';

export function createSlug(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')        // Replace spaces with -
    .replace(/[^\w\-]+/g, '')    // Remove all non-word chars
    .replace(/\-\-+/g, '-');     // Replace multiple - with single -
}

export async function generateUniqueShopSlug(shopName: string): Promise<string> {
  const baseSlug = createSlug(shopName);
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existingShop = await Shop.findOne({ slug });
    if (!existingShop) {
      break;
    }
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
}
