import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectToDatabase from '@/lib/mongoose';
import User from '@/models/User';
import Shop from '@/models/Shop';
import { generateUniqueShopSlug } from '@/lib/slugify';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      name, email, mobile, password, 
      shopName, address, city, state, pincode, 
      whatsappNumber, businessPhone 
    } = body;

    // Validate inputs
    if (!email || !password || !shopName || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    await connectToDatabase();

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ error: 'User already exists' }, { status: 400 });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user (temporarily without shopId)
    const newUser = new User({
      name: name,
      email,
      mobile,
      passwordHash,
      role: 'SHOP_OWNER',
    });

    const savedUser = await newUser.save();

    // Generate Shop Slug
    const slug = await generateUniqueShopSlug(shopName);

    // Create Shop
    const newShop = new Shop({
      ownerId: savedUser._id,
      name: shopName,
      slug,
      address: address || "",
      city: city || "",
      state: state || "",
      pincode: pincode || "",
      whatsappNumber: whatsappNumber || mobile,
      businessPhone: businessPhone || "",
      isApproved: true, // Auto-approve for self-serve SaaS so it doesn't 404!
    });

    const savedShop = await newShop.save();

    // Update user with shopId
    savedUser.shopId = savedShop._id;
    await savedUser.save();

    return NextResponse.json(
      { message: 'Shop created successfully', shopUrl: `/shop/${savedShop.slug}` },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Registration Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
