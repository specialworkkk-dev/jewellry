import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectToDatabase from '@/lib/mongoose';
import User from '@/models/User';
import Shop from '@/models/Shop';
import PlatformSettings from '@/models/PlatformSettings';
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
    if (!name?.trim() || !email?.trim() || !password || !shopName?.trim()) {
      return NextResponse.json({ error: 'Name, email, password and shop name are required' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedMobile = mobile?.toString().trim();
    const passwordText = password.toString();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Please enter a valid email address' }, { status: 400 });
    }

    if (passwordText.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long' }, { status: 400 });
    }

    if (!normalizedMobile || !/^[+]?\d{8,15}$/.test(normalizedMobile.replace(/\s+/g, ''))) {
      return NextResponse.json({ error: 'Please enter a valid mobile number with 8-15 digits' }, { status: 400 });
    }

    if (shopName.trim().length < 2) {
      return NextResponse.json({ error: 'Shop name must be at least 2 characters long' }, { status: 400 });
    }

    await connectToDatabase();

    const platformSettings = await PlatformSettings.findOne({ key: 'default' }).lean();
    if (platformSettings && platformSettings.allowPublicRegistration === false) {
      return NextResponse.json({ error: 'New shop registrations are temporarily disabled by the platform admin.' }, { status: 403 });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 400 });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user (temporarily without shopId)
    const newUser = new User({
      name: name.trim(),
      email: normalizedEmail,
      mobile: normalizedMobile,
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
      isApproved: platformSettings ? platformSettings.allowAutoApproval !== false : true,
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
