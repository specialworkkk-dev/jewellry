import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectToDatabase from '@/lib/mongoose';
import User from '@/models/User';
import Shop from '@/models/Shop';
import { pickRandomStorefrontTemplate } from '@/lib/storefront-template';
import PlatformSettings from '@/models/PlatformSettings';
import { generateUniqueShopSlug } from '@/lib/slugify';
import { checkRateLimit, requestClientId } from '@/lib/rate-limit';
import { isDuplicateKeyError, isRecord } from '@/lib/validation';

export async function POST(req: Request) {
  let createdUserId: string | undefined;
  let createdShopId: string | undefined;

  try {
    const rate = await checkRateLimit(`register:${requestClientId(req)}`, 5, 60 * 60 * 1000);
    if (!rate.allowed) {
      return NextResponse.json(
        { error: 'Too many registration attempts. Please try again later.' },
        { status: 429, headers: { 'Retry-After': String(rate.retryAfterSeconds) } },
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request payload.' }, { status: 400 });
    }

    if (!isRecord(body)) {
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
    // bcrypt silently truncates at 72 bytes; reject instead of weakening the password.
    if (Buffer.byteLength(passwordValue, 'utf8') > 72) {
      return NextResponse.json({ error: 'Password must be at most 72 bytes long.' }, { status: 400 });
    }
    if (nameValue.length > 100 || emailValue.length > 254 || shopNameValue.length > 100) {
      return NextResponse.json({ error: 'One or more fields are too long.' }, { status: 400 });
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
      createdUserId = savedUser._id.toString();
    } catch (error: unknown) {
      if (isDuplicateKeyError(error)) {
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
          address: typeof address === 'string' ? address.trim().slice(0, 300) : '',
          city: typeof city === 'string' ? city.trim().slice(0, 100) : '',
          state: typeof state === 'string' ? state.trim().slice(0, 100) : '',
          pincode: typeof pincode === 'string' ? pincode.trim().slice(0, 12) : '',
          whatsappNumber: typeof whatsappNumber === 'string' ? whatsappNumber.trim().slice(0, 20) : normalizedMobile,
          businessPhone: typeof businessPhone === 'string' ? businessPhone.trim().slice(0, 20) : '',
          storefrontTemplate: pickRandomStorefrontTemplate(),
          isApproved: platformSettings ? platformSettings.allowAutoApproval !== false : true,
        }).save();
        createdShopId = savedShop._id.toString();
        break;
      } catch (error: unknown) {
        if (!isDuplicateKeyError(error)) {
          throw error;
        }
        shopSlugAttempt += 1;
        if (shopSlugAttempt >= 8) {
          await User.findByIdAndDelete(savedUser._id);
          return NextResponse.json({ error: 'We could not create a unique shop URL. Please try a different shop name.' }, { status: 409 });
        }
      }
    }

    if (!savedShop) {
      await User.findByIdAndDelete(savedUser._id);
      return NextResponse.json({ error: 'We could not create your shop due to a duplicate URL conflict. Please try a different shop name.' }, { status: 409 });
    }

    try {
      savedUser.shopId = savedShop._id;
      await savedUser.save();
    } catch (error: unknown) {
      if (isDuplicateKeyError(error)) {
        await Shop.findByIdAndDelete(savedShop._id);
        await User.findByIdAndDelete(savedUser._id);
        return NextResponse.json({ error: 'This shop already belongs to an account. Please try again.' }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json(
      { message: 'Shop created successfully', shopUrl: `/shop/${savedShop.slug}` },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error('Registration Error:', error);
    if (createdShopId || createdUserId) {
      await Promise.allSettled([
        ...(createdShopId ? [Shop.deleteOne({ _id: createdShopId })] : []),
        ...(createdUserId ? [User.deleteOne({ _id: createdUserId })] : []),
      ]);
    }
    return NextResponse.json({ error: 'Something went wrong while creating your shop. Please try again.' }, { status: 500 });
  }
}
