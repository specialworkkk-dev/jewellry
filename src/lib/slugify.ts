import Shop from '@/models/Shop';

export function createSlug(text: string): string {
  const result = text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9\-]+/g, '')
    .replace(/\-+/g, '-')
    .replace(/^-+|-+$/g, '');

  return result || 'shop';
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
