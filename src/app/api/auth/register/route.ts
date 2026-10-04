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

    const nameValue = typeof name === 'string' ? name.trim() : '';
    const usernameValue = typeof username === 'string' ? username.trim().toLowerCase() : '';
    const emailValue = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const mobileValue = typeof mobile === 'string' ? mobile.trim() : '';
    const passwordValue = typeof password === 'string' ? password : '';
    const shopNameValue = typeof shopName === 'string' ? shopName.trim() : '';

    if (!nameValue || !usernameValue || !passwordValue || !shopNameValue) {
      return NextResponse.json({ error: 'Name, username, password and shop name are required.' }, { status: 400 });
    }

    if (!/^[a-z0-9._-]{3,20}$/.test(usernameValue)) {
      return NextResponse.json({ error: 'Username must be 3-20 characters using letters, numbers, dots, underscores or hyphens.' }, { status: 400 });
    }

    if (emailValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
      return NextResponse.json({ error: 'Please enter a valid email address or leave it empty.' }, { status: 400 });
    }

    if (passwordValue.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters long.' }, { status: 400 });
    }

    const normalizedMobile = mobileValue.replace(/\s+/g, '');
    if (!normalizedMobile || !/^[+]?\d{8,15}$/.test(normalizedMobile)) {
      return NextResponse.json({ error: 'Please enter a valid mobile number with 8-15 digits.' }, { status: 400 });
    }

    if (shopNameValue.length < 2) {
      return NextResponse.json({ error: 'Shop name must be at least 2 characters long.' }, { status: 400 });
    }

    try {
      await connectToDatabase();
    } catch {
      return NextResponse.json({ error: 'Database is currently unavailable. Please try again shortly.' }, { status: 503 });
    }

    const platformSettings = await PlatformSettings.findOne({ key: 'default' }).lean();
    if (platformSettings && platformSettings.allowPublicRegistration === false) {
      return NextResponse.json({ error: 'New shop registrations are temporarily disabled by the platform admin.' }, { status: 403 });
    }

    const existingUserByUsername = await User.findOne({ username: usernameValue });
    if (existingUserByUsername) {
      return NextResponse.json({ error: 'This username is already taken.' }, { status: 400 });
    }

    if (emailValue) {
      const existingUserByEmail = await User.findOne({ email: emailValue });
      if (existingUserByEmail) {
        return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 400 });
      }
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(passwordValue, salt);

    const newUser = new User({
      name: nameValue,
      username: usernameValue,
      email: emailValue || undefined,
      mobile: normalizedMobile,
      passwordHash,
      role: 'SHOP_OWNER',
    });

    const savedUser = await newUser.save();
    const slug = await generateUniqueShopSlug(shopNameValue);

    const newShop = new Shop({
      ownerId: savedUser._id,
      name: shopNameValue,
      slug,
      address: typeof address === 'string' ? address : '',
      city: typeof city === 'string' ? city : '',
      state: typeof state === 'string' ? state : '',
      pincode: typeof pincode === 'string' ? pincode : '',
      whatsappNumber: typeof whatsappNumber === 'string' ? whatsappNumber : normalizedMobile,
      businessPhone: typeof businessPhone === 'string' ? businessPhone : '',
      isApproved: platformSettings ? platformSettings.allowAutoApproval !== false : true,
    });

    const savedShop = await newShop.save();

    savedUser.shopId = savedShop._id;
    await savedUser.save();

    return NextResponse.json(
      { message: 'Shop created successfully', shopUrl: `/shop/${savedShop.slug}` },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Registration Error:', error);
    return NextResponse.json({ error: 'Something went wrong while creating your shop. Please try again.' }, { status: 500 });
  }
}
