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
      name, username, email, mobile, password, 
      shopName, address, city, state, pincode, 
      whatsappNumber, businessPhone 
    } = body;

    // Validate inputs
    if (!name?.trim() || !username?.trim() || !password || !shopName?.trim()) {
      return NextResponse.json({ error: 'Name, username, password and shop name are required' }, { status: 400 });
    }

    const normalizedUsername = username.toString().trim().toLowerCase();
    const normalizedEmail = email?.toString().trim().toLowerCase() || '';
    const normalizedMobile = mobile?.toString().trim();
    const passwordText = password.toString();

    if (!/^[a-z0-9._-]{3,20}$/.test(normalizedUsername)) {
      return NextResponse.json({ error: 'Username must be 3-20 characters using letters, numbers, dots, underscores or hyphens.' }, { status: 400 });
    }

    if (normalizedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
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
    const existingUserByUsername = await User.findOne({ username: normalizedUsername });
    if (existingUserByUsername) {
      return NextResponse.json({ error: 'This username is already taken' }, { status: 400 });
    }

    if (normalizedEmail) {
      const existingUserByEmail = await User.findOne({ email: normalizedEmail });
      if (existingUserByEmail) {
        return NextResponse.json({ error: 'An account with this email already exists' }, { status: 400 });
      }
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user (temporarily without shopId)
    const newUser = new User({
      name: name.trim(),
      username: normalizedUsername,
      email: normalizedEmail || undefined,
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
