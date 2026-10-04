"use server";

import connectToDatabase from "@/lib/mongoose";
import Category from "@/models/Category";

export async function getCategoriesAction() {
  await connectToDatabase();
  const categories = await Category.find({ isSystemDefault: true }).lean();
  return JSON.parse(JSON.stringify(categories));
}
