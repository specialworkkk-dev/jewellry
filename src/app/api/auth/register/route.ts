import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectToDatabase from '@/lib/mongoose';
import User from '@/models/User';
import Shop from '@/models/Shop';
import PlatformSettings from '@/models/PlatformSettings';
import { generateUniqueShopSlug } from '@/lib/slugify';

export async function POST(req: Request) {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
    }

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

    let savedUser;
    try {
      savedUser = await new User({
        name: nameValue,
        username: usernameValue,
        email: emailValue || undefined,
        mobile: normalizedMobile,
        passwordHash,
        role: 'SHOP_OWNER',
      }).save();
    } catch (error: any) {
      if (error?.code === 11000) {
        return NextResponse.json({ error: 'This username or email is already in use. Please choose another.' }, { status: 409 });
      }
      throw error;
    }

    let savedShop;
    let shopSlugAttempt = 0;

    while (shopSlugAttempt < 8) {
      try {
        const slug = await generateUniqueShopSlug(shopNameValue);
        savedShop = await new Shop({
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
        }).save();
        break;
      } catch (error: any) {
        if (error?.code !== 11000 || !error?.keyPattern || !error.keyPattern.slug) {
          throw error;
        }
        shopSlugAttempt += 1;
        if (shopSlugAttempt >= 8) {
          return NextResponse.json({ error: 'We could not create a unique shop URL. Please try a different shop name.' }, { status: 409 });
        }
      }
    }

    if (!savedShop) {
      return NextResponse.json({ error: 'We could not create your shop due to a duplicate URL conflict. Please try a different shop name.' }, { status: 409 });
    }

    try {
      savedUser.shopId = savedShop._id;
      await savedUser.save();
    } catch (error: any) {
      if (error?.code === 11000) {
        return NextResponse.json({ error: 'This shop already belongs to an account. Please try again.' }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json(
      { message: 'Shop created successfully', shopUrl: `/shop/${savedShop.slug}` },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Registration Error:', error);
    return NextResponse.json({ error: 'Something went wrong while creating your shop. Please try again.' }, { status: 500 });
  }
}
