# MASTER PROMPT — GOLD & JEWELLERY DIGITAL STOREFRONT SaaS

You are a senior full-stack architect, UI/UX designer, database engineer, DevOps engineer, security engineer, and product engineer.

Build a complete, production-ready, multi-tenant SaaS web application for **gold and jewellery shops**.

The application should combine:

- Instagram-style social feed
- Premium jewellery e-commerce-style storefront
- Digital catalogue
- Shop advertising/promotions
- Product management
- Customer engagement
- WhatsApp enquiry
- Likes/shares
- Shop-specific public URL
- PWA installation
- QR-code sharing
- Analytics
- Cloudflare R2 media storage

The goal is to allow a jewellery shop owner to create a beautiful digital shop page, upload jewellery photos/videos, publish products and advertisements, and share one unique URL with customers.

Customers should be able to open that URL and experience the jewellery shop like a premium social-media-inspired website.

---

# 1. PRODUCT CONCEPT

The platform is a multi-tenant SaaS.

Example:

Main platform:

https://yourdomain.com

A jewellery shop registers:

Royal Jewellers

The system automatically creates:

https://yourdomain.com/shop/royal-jewellers

The shop owner can share this URL through:

- WhatsApp
- Instagram
- Facebook
- QR code
- SMS
- Email
- Business card
- Google Business Profile
- Website

When a customer opens the URL, they should immediately see a premium digital storefront for that jewellery shop.

No customer login should be required just to browse.

Customer login is required only for features such as:

- Like
- Favorite
- Follow shop
- Notifications
- Saved products
- Enquiries/history

---

# 2. PRIMARY USERS

Create three roles.

## PLATFORM ADMIN

Admin controls the entire SaaS.

Admin can:

- View all shops
- Approve/reject shops
- Suspend shops
- Delete shops
- View users
- View subscriptions
- View platform analytics
- Manage subscription plans
- Manage advertisements
- View reports
- View storage usage
- View bandwidth/media statistics
- Manage categories
- Manage platform settings

---

# SHOP OWNER

Shop owners can:

- Register
- Login
- Create shop
- Edit shop profile
- Upload logo
- Upload cover/banner
- Upload photos
- Upload videos
- Create products
- Edit products
- Delete products
- Publish/unpublish products
- Create advertisements
- Create offers
- Create stories
- Manage categories
- Manage customers
- View enquiries
- View analytics
- Generate QR code
- Copy public shop link
- Share shop link
- Manage social links
- Manage business information
- Manage staff in future
- Manage subscription

---

# CUSTOMER

Customers can:

- Open public shop URL
- Browse products
- Browse photos
- Watch videos
- Like products/posts
- Share products
- Favorite products
- Follow shops
- Search products
- Filter products
- View offers
- View stories
- Contact shop
- WhatsApp shop
- Call shop
- Get directions
- Submit enquiry
- Install PWA
- Scan QR code
- View shop information

Customer should NOT need an account to browse.

---

# 3. TECHNOLOGY STACK

Use a modern production-ready stack.

## FRONTEND

Use:

- Next.js latest stable
- TypeScript
- React
- Tailwind CSS
- shadcn/ui
- Framer Motion
- Lucide Icons

Use App Router.

Use responsive design.

Mobile-first.

The website must work perfectly on:

- Mobile
- Tablet
- Laptop
- Desktop

---

# 4. BACKEND

Preferred architecture:

Next.js frontend + Node.js/TypeScript backend API.

Use:

- Node.js
- TypeScript
- Express or NestJS
- REST API
- JWT/session authentication
- Zod validation

Keep backend modular.

Structure:

controllers
services
repositories
models
middleware
routes
validators
utils
config

If using Next.js API routes instead of a separate backend, maintain the same modular architecture.

---

# 5. DATABASE

Use:

MongoDB Atlas

Use:

Mongoose

Database must be designed for multi-tenancy.

Every shop-owned resource must contain:

shopId

Never allow a shop owner to access another shop's data.

Important collections:

users
shops
products
categories
media
posts
likes
favorites
shares
followers
stories
advertisements
enquiries
analytics
subscriptions
notifications
auditLogs

---

# 6. SHOP REGISTRATION

Create a professional registration flow.

Fields:

- Owner name
- Email
- Mobile number
- Password
- Shop name
- Shop address
- City
- State
- Pincode
- WhatsApp number
- Business phone

After registration:

1. Create user
2. Create shop
3. Generate unique slug
4. Generate shop public URL
5. Create default shop settings
6. Redirect to dashboard

Example:

Shop name:

Royal Jewellers

Slug:

royal-jewellers

Public URL:

/shop/royal-jewellers

Slug must be unique.

Handle duplicate names automatically.

Example:

royal-jewellers
royal-jewellers-2
royal-jewellers-ahmedabad

---

# 7. PUBLIC SHOP PAGE

This is the most important page.

Design it like:

Instagram + Pinterest + premium jewellery website.

It must look extremely premium.

Do NOT make it look like a basic CRUD dashboard.

Use:

- Large jewellery photography
- Elegant typography
- Smooth animations
- Premium cards
- Large visual sections
- Minimal interface
- White/black/gold-inspired luxury aesthetic
- Plenty of whitespace
- Soft shadows
- Rounded cards
- Smooth hover effects
- Skeleton loading
- Lazy loading

Do not overuse gold colors.

Keep the design sophisticated.

---

# 8. PUBLIC SHOP HEADER

Display:

Shop logo

Shop name

Verified badge if applicable

Short description

Location

Followers

Follow button

Share button

WhatsApp button

Call button

Directions button

Instagram

Facebook

Website

Opening hours

Example:

ROYAL JEWELLERS

Ahmedabad, Gujarat

"Premium Gold & Diamond Jewellery"

[Follow]

[Share]

[WhatsApp]

[Call]

[Directions]

---

# 9. HERO SECTION

Create a premium hero section.

Shop owner can configure:

- Hero image
- Hero video
- Heading
- Subheading
- CTA
- Button URL

Example:

"Timeless Jewellery for Every Celebration"

"Discover our latest bridal and diamond collection."

Buttons:

Explore Collection
WhatsApp Us

Hero must be responsive.

---

# 10. STORIES

Create Instagram-style stories.

Shop owner can upload:

- Image
- Short video

Stories automatically expire after 24 hours.

Display circular story thumbnails.

Clicking opens a full-screen story viewer.

Features:

- Next
- Previous
- Progress indicator
- Close
- Pause
- Auto advance

Track story views.

---

# 11. SOCIAL FEED

Create a social feed.

Shop owner can create posts.

Post can contain:

- Image
- Multiple images
- Video
- Product reference
- Caption
- Tags
- Offer
- CTA

Customers can:

- Like
- Share
- Favorite
- View
- Enquire

Create an Instagram-style feed.

Support:

Single image

Carousel

Video

Product post

Advertisement post

---

# 12. PRODUCT SYSTEM

Products are the core business feature.

Product fields:

- Product name
- SKU
- Category
- Subcategory
- Description
- Images
- Videos
- Price
- Original price
- Discount
- Price type
- Gold purity
- Gold weight
- Diamond weight
- Stone type
- Stone weight
- Making charges
- GST
- Availability
- Stock status
- Tags
- Featured
- New arrival
- Bestseller
- Bridal collection
- Published status

Price types:

FIXED_PRICE

STARTING_FROM

PRICE_ON_REQUEST

CONTACT_FOR_PRICE

---

# 13. JEWELLERY CATEGORIES

Default categories:

- Rings
- Necklaces
- Chains
- Earrings
- Bangles
- Bracelets
- Pendants
- Mangalsutra
- Nose Pins
- Anklets
- Bridal Jewellery
- Wedding Jewellery
- Men's Jewellery
- Kids Jewellery
- Diamond Jewellery
- Gold Jewellery
- Silver Jewellery

Allow shop owners to create custom categories.

---

# 14. PRODUCT PAGE

Each product must have its own SEO-friendly URL.

Example:

/shop/royal-jewellers/product/bridal-gold-necklace

Product page should show:

Large image gallery

Video

Product name

Price

Discount

Gold purity

Gold weight

Diamond details

Description

Availability

Share button

Like button

Favorite button

WhatsApp enquiry

Call shop

Directions

Related products

Similar products

Shop information

---

# 15. PRODUCT SHARING

Every product should have a unique URL.

When shared on WhatsApp/Facebook/etc., generate a beautiful OpenGraph preview.

OpenGraph should contain:

Product image

Product name

Shop name

Price if enabled

Short description

Example:

Royal Jewellers
Bridal Gold Necklace
22K Gold
₹1,25,000

---

# 16. IMAGE UPLOAD

Use Cloudflare R2.

Do NOT store large images/videos inside MongoDB.

MongoDB stores:

- Media URL
- R2 object key
- File type
- File size
- Width
- Height
- Duration
- MIME type
- Shop ID
- Product ID
- Upload date

Actual files must live in:

Cloudflare R2

---

# 17. CLOUDFLARE R2 ARCHITECTURE

Use R2 for:

- Product images
- Shop logos
- Cover images
- Post images
- Videos
- Story media
- Advertisement media

Use signed upload URLs.

Flow:

1. Frontend requests upload URL
2. Backend validates user/shop
3. Backend generates signed upload URL
4. Frontend uploads directly to R2
5. Backend stores media metadata in MongoDB

Do NOT send large files through the application server unnecessarily.

This is important for scalability.

---

# 18. MEDIA OPTIMIZATION

Images must be optimized.

Generate/use:

- Thumbnail
- Medium
- Large

Use WebP/AVIF where appropriate.

Lazy-load images.

Do not load every image when the page opens.

Use:

IntersectionObserver

Responsive image sizes

Next.js Image optimization where compatible.

Videos should:

- Use compressed formats
- Have poster thumbnails
- Lazy-load
- Avoid autoplay with sound
- Use muted autoplay only when appropriate
- Load only when needed

---

# 19. STORAGE STRUCTURE

Use R2 keys such as:

shops/{shopId}/logo/{file}
shops/{shopId}/cover/{file}

shops/{shopId}/products/{productId}/{file}

shops/{shopId}/posts/{postId}/{file}

shops/{shopId}/stories/{storyId}/{file}

shops/{shopId}/ads/{adId}/{file}

Never allow arbitrary user-controlled paths.

---

# 20. LIKE SYSTEM

Users can like:

- Products
- Posts

Store likes efficiently.

Prevent duplicate likes.

One customer account = one like per object.

Allow:

Like
Unlike

Display count.

Use optimistic UI.

---

# 21. SHARE SYSTEM

Products and posts should have share buttons.

Support:

- Native mobile share
- WhatsApp
- Facebook
- Copy link
- Telegram
- X
- Email

Track share count.

Use Web Share API when available.

---

# 22. FAVORITES

Customers can save products.

Create:

My Favorites

Customers can see all saved jewellery.

---

# 23. FOLLOW SYSTEM

Customers can follow shops.

Shop owner can see:

Follower count

Follower growth

Customer should receive notifications for:

- New arrivals
- New offers
- Important shop announcements

Do not spam notifications.

---

# 24. ENQUIRY SYSTEM

This is more important than online checkout for MVP.

Customer clicks:

"Enquire Now"

Show:

Name
Mobile
Message

Optional:

Preferred contact method

Create enquiry.

Owner dashboard shows:

New
Contacted
Interested
Converted
Closed

Owner can update status.

---

# 25. WHATSAPP ENQUIRY

Every product should have:

"Enquire on WhatsApp"

Generate WhatsApp message automatically.

Example:

Hello Royal Jewellers,

I am interested in:

Bridal Gold Necklace

Product link:
...

Please share more details.

Do not hardcode shop phone numbers.

---

# 26. ADVERTISEMENT SYSTEM

Shop owners can create promotional advertisements.

Advertisement fields:

- Title
- Subtitle
- Image
- Video
- CTA
- Discount
- Start date
- End date
- Status
- Target products
- Category

Examples:

"Diwali Gold Collection"

"Wedding Season Special"

"New Bridal Collection"

"20% Making Charge Offer"

"Akshaya Tritiya Special"

"New Diamond Collection"

Display ads beautifully.

---

# 27. PROMOTIONAL BANNERS

Allow shop owners to create banners.

Types:

Hero banner

Collection banner

Offer banner

Festival banner

New arrival banner

Limited-time offer

Each banner can have:

Image/video

Title

Subtitle

CTA

Link

Start date

End date

---

# 28. GOLD RATE FEATURE

Prepare architecture for future gold-rate integration.

Do NOT hardcode gold prices.

Create configuration:

goldRateProvider

currency

22K

24K

18K

lastUpdated

Later integrate an external gold-rate API.

Shop owner can optionally display:

Today's Gold Rate

22K: ₹XXXX/g

24K: ₹XXXX/g

---

# 29. QR CODE

Every shop automatically gets a QR code.

QR points to:

/shop/{slug}

Owner can:

Download QR

Print QR

Share QR

Show QR

Generate QR poster

Create a beautiful QR poster:

"Scan to Explore Our Collection"

---

# 30. OWNER DASHBOARD

Create a premium admin dashboard.

Sidebar:

Dashboard

Shop Profile

Products

Categories

Posts

Stories

Advertisements

Offers

Enquiries

Customers

Analytics

QR Code

Subscription

Settings

Logout

---

# 31. DASHBOARD OVERVIEW

Show:

Today's visitors

Total visitors

Product views

Likes

Shares

Followers

Enquiries

Top products

Top posts

Storage usage

Media count

Recent activity

Charts:

Visitors

Product views

Likes

Shares

Enquiries

Use attractive charts.

---

# 32. PRODUCT CRUD

Complete CRUD.

CREATE

READ

UPDATE

DELETE

Also:

Publish

Unpublish

Duplicate

Feature

Archive

Bulk select

Bulk delete

Bulk publish

Bulk category update

Search

Filter

Sort

Pagination

---

# 33. MEDIA LIBRARY

Create a media library.

Show:

Images

Videos

File size

Upload date

Used by

Storage usage

Allow:

Search

Filter

Delete unused media

Preview

Copy URL

---

# 34. SHOP PROFILE

Owner can manage:

Shop name

Logo

Cover

Description

Phone

WhatsApp

Email

Address

Google Maps location

Opening hours

Instagram

Facebook

Website

About

Policies

Social links

---

# 35. CUSTOMER DISCOVERY

MVP should NOT be a global marketplace.

Customers primarily enter through the shop's unique URL.

However, architect the system so a future:

/explore

page can be added.

Future features:

Search shops

Search jewellery

Nearby shops

Categories

Trending jewellery

Featured shops

---

# 36. PWA

Make the application installable.

Include:

manifest.json

service worker

icons

install prompt

offline fallback

app metadata

Customers should be able to install the webapp.

Do NOT force installation.

Use a subtle:

"Install App"

prompt.

---

# 37. RESPONSIVE DESIGN

Mobile experience is the highest priority.

Mobile navigation:

Home

Explore

Favorites

Enquiries

Profile

For shop owner dashboard:

Use mobile-friendly navigation.

Never create a desktop-only dashboard.

---

# 38. DESIGN SYSTEM

Use a luxury jewellery aesthetic.

Design inspiration:

Instagram

Pinterest

Apple

Vercel

Luxury jewellery websites

Do NOT copy any brand exactly.

Use:

Elegant typography

Premium spacing

Large photography

Smooth animations

Minimal buttons

Subtle gradients

Soft borders

Modern cards

High-quality skeleton loaders

Micro-interactions

---

# 39. ANIMATIONS

Use Framer Motion.

Animations should include:

Page transitions

Card hover

Image reveal

Modal animation

Story transitions

Button interactions

Like animation

Toast animation

Dashboard transitions

Do NOT overanimate.

Performance is more important than animations.

---

# 40. SEO

Every public shop must be SEO optimized.

Generate:

Title

Description

Canonical URL

OpenGraph

Twitter/X card

Structured data

Product schema

LocalBusiness schema

Breadcrumb schema

Dynamic sitemap

robots.txt

Example title:

Royal Jewellers | Gold & Diamond Jewellery in Ahmedabad

---

# 41. PERFORMANCE

Target:

Lighthouse 90+

Optimize for Core Web Vitals.

Use:

Lazy loading

Pagination

Infinite scroll where appropriate

Image optimization

Video lazy loading

Caching

Database indexes

API pagination

Debouncing

CDN

Compression

Skeleton loading

Do not fetch unnecessary data.

The public shop page must remain fast even with hundreds of products.

---

# 42. SCALABILITY

Design for:

Thousands of shops

Millions of products

Millions of customers

High media traffic

7,000+ daily visitors initially

The application should not assume only one shop.

Every database query must be tenant-aware.

Add indexes for:

shopId

slug

productId

category

createdAt

status

published

userId

---

# 43. DATABASE INDEXES

Create appropriate MongoDB indexes.

Examples:

shops.slug unique

products.shopId + createdAt

products.shopId + category

products.shopId + published

products.shopId + featured

likes.userId + productId unique

favorites.userId + productId unique

followers.userId + shopId unique

enquiries.shopId + status

analytics.shopId + createdAt

---

# 44. SECURITY

Implement:

Password hashing

Secure authentication

HTTP-only cookies where appropriate

CSRF protection where applicable

Rate limiting

Input validation

Zod validation

XSS protection

MongoDB injection protection

CORS

File MIME validation

File size validation

Signed R2 uploads

Authorization middleware

Role-based access

Tenant isolation

Audit logs

Secure headers

No secrets in frontend

Never trust shopId supplied by client.

Always derive ownership from authenticated user.

---

# 45. FILE UPLOAD SECURITY

Allow only approved MIME types.

Images:

JPEG

PNG

WEBP

AVIF

Videos:

MP4

WEBM

Reject:

Executable files

HTML

SVG unless sanitized

Unknown formats

Set reasonable size limits.

Example:

Image max:

10 MB

Video max:

200 MB

Make these configurable.

---

# 46. API DESIGN

Create REST endpoints.

AUTH:

POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET /api/auth/me

SHOPS:

POST /api/shops
GET /api/shops/:slug
PATCH /api/shops/:id
DELETE /api/shops/:id

PRODUCTS:

POST /api/products
GET /api/products
GET /api/products/:id
PATCH /api/products/:id
DELETE /api/products/:id

MEDIA:

POST /api/media/upload-url
POST /api/media/complete
DELETE /api/media/:id

POSTS:

POST /api/posts
GET /api/posts
PATCH /api/posts/:id
DELETE /api/posts/:id

STORIES:

POST /api/stories
GET /api/stories
DELETE /api/stories/:id

LIKES:

POST /api/products/:id/like
DELETE /api/products/:id/like

FAVORITES:

POST /api/products/:id/favorite
DELETE /api/products/:id/favorite

FOLLOW:

POST /api/shops/:id/follow
DELETE /api/shops/:id/follow

ENQUIRIES:

POST /api/enquiries
GET /api/enquiries
PATCH /api/enquiries/:id

ADVERTISEMENT:

POST /api/advertisements
GET /api/advertisements
PATCH /api/advertisements/:id
DELETE /api/advertisements/:id

ANALYTICS:

GET /api/analytics/overview
GET /api/analytics/visitors
GET /api/analytics/products
GET /api/analytics/posts

---

# 47. ANALYTICS

Track:

Page views

Unique visitors

Product views

Post views

Video views

Likes

Shares

Favorites

Followers

Enquiries

WhatsApp clicks

Call clicks

Direction clicks

QR scans

Install clicks

Track daily/monthly statistics.

Avoid storing unnecessary personal information.

---

# 48. SUBSCRIPTION SYSTEM

Design the SaaS for monetization.

Initial plans:

FREE

₹0/month

STARTER

₹499/month

PROFESSIONAL

₹999/month

BUSINESS

₹1,999/month

These are configurable from admin.

Do not hardcode plan limitations.

Possible limits:

Number of products

Number of media uploads

Video uploads

Storage

Analytics

Advertisements

Staff

Custom domain

Advanced features

---

# 49. FUTURE PAYMENT INTEGRATION

Prepare architecture for:

Razorpay

Stripe

Subscription billing

Do not implement payment processing unless specifically requested.

Keep:

subscriptionStatus

planId

billingCycle

startDate

endDate

paymentProvider

paymentCustomerId

paymentSubscriptionId

---

# 50. ADMIN PANEL

Admin routes:

/admin

/admin/shops

/admin/users

/admin/products

/admin/subscriptions

/admin/reports

/admin/analytics

/admin/settings

Admin can:

Approve shop

Suspend shop

Delete shop

Change plan

View storage

View traffic

View subscriptions

---

# 51. ERROR HANDLING

Create global error handling.

API should return consistent format:

{
"success": false,
"message": "...",
"code": "...",
"errors": []
}

Frontend should show:

Toast

Inline validation

Empty states

Error states

Retry button

Loading states

---

# 52. EMPTY STATES

Design beautiful empty states.

Examples:

"No products yet"

"Create your first jewellery product."

"No enquiries yet"

"Customer enquiries will appear here."

"No stories today"

"Share today's collection."

Do not show blank screens.

---

# 53. NOTIFICATIONS

Notification system should support:

New enquiry

New follower

Product liked

Advertisement ending

Subscription ending

Important admin notifications

Implement notification preferences.

---

# 54. CUSTOMER PROFILE

Customer profile:

Name

Mobile

Email

Favorites

Following

Enquiries

Notifications

Settings

Do not require unnecessary personal data.

---

# 55. SHOP OWNER ONBOARDING

After registration, show onboarding:

Step 1:

Shop details

Step 2:

Logo

Step 3:

Cover image

Step 4:

First product

Step 5:

First post

Step 6:

Generate QR

Step 7:

Share shop

Show progress:

"Your shop is 70% complete."

---

# 56. DEMO DATA

Create seed data.

Create:

3 demo shops

20+ products per shop

Posts

Stories

Advertisements

Customers

Likes

Favorites

Enquiries

Analytics

This is important for development and UI testing.

---

# 57. PROJECT STRUCTURE

Use a clean scalable structure.

Example:

frontend/

app/
components/
features/
hooks/
lib/
services/
types/
utils/
public/

backend/

src/
controllers/
services/
models/
routes/
middleware/
validators/
utils/
config/

database/

scripts/

docs/

tests/

---

# 58. ENVIRONMENT VARIABLES

Create:

.env.example

Include placeholders:

MONGODB_URI=

JWT_SECRET=

R2_ACCOUNT_ID=

R2_ACCESS_KEY_ID=

R2_SECRET_ACCESS_KEY=

R2_BUCKET_NAME=

R2_PUBLIC_URL=

NEXT_PUBLIC_APP_URL=

WHATSAPP_NUMBER=

Do not commit .env.

Add .env to .gitignore.

---

# 59. CLOUDFLARE R2 CONFIGURATION

Use environment variables.

Never expose:

R2_ACCESS_KEY_ID

R2_SECRET_ACCESS_KEY

to browser/client code.

Only backend can generate signed URLs.

Create an R2 service:

r2Service

Functions:

generateUploadUrl()

generateDownloadUrl()

deleteObject()

getObjectMetadata()

listObjects()

---

# 60. MEDIA COST OPTIMIZATION

The platform may have thousands of daily visitors.

Optimize media delivery aggressively.

Do NOT download all shop images at once.

Use:

Lazy loading

Responsive images

Thumbnails

Poster images

Pagination

Caching

CDN-compatible URLs

Browser caching

Efficient video delivery

This is critical because media bandwidth will be the largest traffic component.

---

# 61. SOCIAL-MEDIA-LIKE EXPERIENCE

The customer page should feel like a social platform.

For example:

Top:

Shop profile

Stories

Featured collections

Then:

Social feed

Then:

Jewellery catalogue

Then:

Offers

Then:

About shop

Then:

Contact

Use sticky mobile actions:

WhatsApp

Call

Share

---

# 62. HOME PAGE

Main platform home page should explain the SaaS.

Headline:

"Turn Your Jewellery Shop Into a Digital Storefront."

Subheading:

"Showcase your jewellery, share your collection and connect with customers through one beautiful link."

CTA:

Create Your Shop

Explore Demo

Sections:

Features

How it works

Benefits

Pricing

Demo shop

Testimonials

FAQ

Footer

---

# 63. SHOP OWNER VALUE PROPOSITION

Clearly communicate:

One link for your jewellery shop.

Upload your collection.

Share everywhere.

Get customer enquiries.

Track engagement.

Promote offers.

Build your digital presence.

---

# 64. CUSTOMER EXPERIENCE

Customer opens:

yourdomain.com/shop/royal-jewellers

Within seconds they should see:

Royal Jewellers

Premium Gold & Diamond Jewellery

Stories

Featured collection

Latest products

Offers

Videos

Contact options

No registration wall.

No unnecessary popups.

No annoying advertisements from the SaaS platform.

---

# 65. SEARCH AND FILTER

Product search:

Search by name

SKU

Category

Tag

Collection

Price range

Gold purity

Gender

Availability

Sort:

Newest

Popular

Price low-high

Price high-low

Featured

---

# 66. COLLECTIONS

Allow shop owners to create collections.

Examples:

Bridal Collection

Diwali Collection

Daily Wear

Office Wear

Men's Collection

Diamond Collection

Wedding Collection

Create:

Collection name

Description

Cover image

Products

Publish status

---

# 67. BULK OPERATIONS

Owner should be able to select multiple products.

Actions:

Delete

Publish

Unpublish

Feature

Move category

Add tag

Remove tag

---

# 68. AUDIT LOG

Record important actions:

Product created

Product updated

Product deleted

Shop settings changed

Advertisement created

Subscription changed

Admin action

Include:

userId

shopId

action

resource

timestamp

IP where appropriate

---

# 69. TESTING

Create tests for:

Authentication

Authorization

Tenant isolation

Product CRUD

Media upload

Shop creation

Likes

Favorites

Followers

Enquiries

Advertisements

Analytics

API validation

Security

Important:

A shop owner must NEVER be able to read/update/delete another shop's resources.

---

# 70. DEPLOYMENT

Frontend:

Vercel

Database:

MongoDB Atlas

Media:

Cloudflare R2

Domain:

Custom domain

Backend:

If separate backend is used:

Render / Railway / Fly.io / equivalent production platform.

Configure:

HTTPS

Environment variables

CORS

Production database

Production R2

Monitoring

Error logging

---

# 71. DEVELOPMENT EXPERIENCE

Provide:

README.md

Setup instructions

.env.example

Database setup

R2 setup

Local development instructions

Production deployment instructions

API documentation

Architecture documentation

Seed command

Test command

Build command

Lint command

---

# 72. IMPORTANT CODING RULES

Do NOT create fake functionality.

Do NOT use hardcoded fake API responses in production code.

Do NOT store media in MongoDB.

Do NOT expose R2 secrets.

Do NOT mix shop data between tenants.

Do NOT put all logic in one file.

Do NOT create huge components.

Use reusable components.

Use TypeScript strictly.

Avoid:

any

unless absolutely necessary.

Use proper interfaces/types.

Handle loading/error/empty states.

---

# 73. DEVELOPMENT ORDER

Build in this order.

PHASE 1

Project setup

Authentication

MongoDB

Shop registration

Shop slug

Roles

Basic dashboard

PHASE 2

Cloudflare R2

Media upload

Product CRUD

Categories

Media library

PHASE 3

Public shop page

Product page

Social feed

Stories

Likes

Shares

Favorites

PHASE 4

Enquiries

WhatsApp

Call

Directions

Follow

Notifications

PHASE 5

Advertisements

Offers

Collections

QR code

Analytics

PHASE 6

PWA

SEO

OpenGraph

Performance optimization

Security hardening

PHASE 7

Subscription architecture

Admin panel

Deployment

Testing

---

# 74. IMPORTANT UI REQUIREMENT

The application must NOT look like a generic admin template.

Public customer experience must look like a premium jewellery brand.

Owner dashboard should look modern and professional.

Use high-quality responsive layouts.

The first impression must be:

"Wow, this looks like a real premium jewellery platform."

---

# 75. FINAL ACCEPTANCE CRITERIA

The project is considered complete only when:

1. Owner can register.
2. Owner can login.
3. Owner can create a shop.
4. Shop gets unique URL.
5. Owner can upload images.
6. Owner can upload videos.
7. Files are stored in Cloudflare R2.
8. Media metadata is stored in MongoDB.
9. Owner can create products.
10. Owner can edit products.
11. Owner can delete products.
12. Owner can publish/unpublish products.
13. Customer can open public shop URL.
14. Customer can browse products without login.
15. Customer can watch images/videos.
16. Customer can like.
17. Customer can share.
18. Customer can favorite.
19. Customer can follow shop.
20. Customer can submit enquiry.
21. Customer can contact shop through WhatsApp.
22. Customer can call shop.
23. Customer can get directions.
24. Owner can see enquiries.
25. Owner can create advertisements.
26. Owner can create stories.
27. Stories expire automatically.
28. Owner can generate QR code.
29. Analytics work.
30. PWA works.
31. SEO works.
32. OpenGraph previews work.
33. Authentication is secure.
34. Tenant isolation works.
35. R2 credentials are secure.
36. Application is responsive.
37. Application is production-ready.
38. No major console errors.
39. No TypeScript errors.
40. Build succeeds.
41. Database indexes are implemented.
42. API validation exists.
43. Loading states exist.
44. Empty states exist.
45. Error states exist.

---

# 76. MOST IMPORTANT PRODUCT PRINCIPLE

Do NOT build this as simply:

"Jewellery CRUD software."

Build it as:

**"A digital social storefront for jewellery shops."**

The shop owner should feel:

"I have my own Instagram-like jewellery website that I can share with every customer."

The customer should feel:

"This is a beautiful digital version of the jewellery shop where I can discover products, watch videos, save jewellery and contact the shop."

The platform should eventually become the digital presence layer for local jewellery businesses.

---

# START IMPLEMENTATION

First analyze the complete requirements.

Then create the architecture.

Then create the project structure.

Then implement the database models.

Then authentication.

Then shop onboarding.

Then Cloudflare R2 integration.

Then product/media management.

Then public storefront.

Then social functionality.

Then enquiry/WhatsApp functionality.

Then advertisements.

Then analytics.

Then PWA/SEO.

Then security/performance.

Then tests.

Then deployment configuration.

Do not skip foundational architecture.

Do not generate only a UI mockup.

Build the actual working full-stack application.

# ADMIN MASTER PROMPT

## Jewellery SaaS — Complete Admin Control & Shop Limit Management

You are a senior SaaS architect and backend engineer.

Build a **powerful Platform Admin Panel** for the jewellery-shop SaaS.

The Admin must have complete control over **what each shop can upload, post, send, use, and access**.

The most important requirement is that **ALL limits must be configurable from the Admin Panel without changing code or database manually.**

---

# 1. ADMIN CONTROL CENTER

Create:

`/admin`

Admin dashboard must contain:

- Overview
- Shops
- Shop Limits
- Plans
- Customers
- Media
- Products
- Posts
- Videos
- Advertisements
- Messages
- Notifications
- Analytics
- Storage
- Subscriptions
- Settings
- Audit Logs

---

# 2. SHOP LIMIT MANAGEMENT

Admin must be able to open any shop and configure its limits individually.

Example:

Royal Jewellers

Admin clicks:

`Manage Limits`

Display a professional limit-management screen.

---

# 3. IMAGE LIMIT

Admin can configure how many images a particular shop can upload.

Fields:

### Total Image Limit

Example:

`1000 images`

The shop cannot upload more than this number.

Show:

Used:

`600 / 1000`

Remaining:

`400`

Progress bar.

When limit is reached:

"Image upload limit reached. Please upgrade your plan or contact administrator."

---

# 4. VIDEO LIMIT

Admin can configure how many videos a shop can upload.

Example:

Maximum videos:

`100 videos`

Usage:

`60 / 100`

Remaining:

`40`

Prevent uploads after reaching the limit.

---

# 5. STORAGE LIMIT

Admin must also be able to control total storage.

Example:

Storage limit:

`25 GB`

Usage:

`8.4 GB / 25 GB`

Calculate storage from actual Cloudflare R2 media usage.

Include:

Images

Videos

Post media

Story media

Advertisement media

Shop logo

Shop banner

All media must count toward the shop's storage quota unless explicitly excluded by admin.

---

# 6. DAILY UPLOAD LIMIT

Admin can configure daily limits.

Example:

Images per day:

`50`

Videos per day:

`10`

Total media uploads per day:

`60`

Reset automatically at midnight according to configured timezone.

Display to shop owner:

`Today's uploads: 24 / 50`

---

# 7. MONTHLY UPLOAD LIMIT

Admin can configure:

Images per month

Videos per month

Posts per month

Advertisements per month

Stories per month

Reset automatically every billing period/month.

---

# 8. PRODUCT LIMIT

Admin can configure:

Maximum products:

`500`

Example:

Royal Jewellers

Products:

`327 / 500`

Prevent creation of new products after the limit.

---

# 9. CATEGORY LIMIT

Admin can configure:

Maximum custom categories:

`20`

Default platform categories should not necessarily count against this limit.

---

# 10. POST LIMIT

Admin can configure:

Total posts

Posts per day

Posts per month

Example:

Posts:

`120 / 200`

Daily:

`3 / 5`

Monthly:

`47 / 100`

---

# 11. STORY LIMIT

Admin can configure:

Stories per day

Stories per month

Maximum active stories

Example:

Maximum active stories:

`10`

Stories automatically expire after 24 hours.

---

# 12. CUSTOMER / CONTACT LIMIT

Admin must be able to configure how many customers a shop can have.

Important:

A "customer" means a customer record associated with that shop.

Example:

Royal Jewellers

Customer limit:

`5,000`

Current:

`3,450 / 5,000`

Remaining:

`1,550`

When the limit is reached:

Do not allow creation of additional customer records.

Display upgrade/contact-admin message.

---

# 13. CUSTOMER MESSAGE LIMIT

Admin must be able to configure how many customer enquiries/messages a shop can receive.

Support:

Messages per day

Messages per month

Total message history

Example:

Daily enquiry limit:

`100`

Monthly enquiry limit:

`2,000`

Display:

`1,340 / 2,000`

---

# 14. WHATSAPP CLICK LIMIT

Admin can optionally control:

WhatsApp clicks per month

WhatsApp enquiries per month

Example:

WhatsApp enquiries:

`750 / 1,000`

This should be configurable and optionally unlimited.

---

# 15. CUSTOMER NOTIFICATION LIMIT

Admin can configure how many promotional notifications a shop can send.

Example:

Push notifications per month:

`5,000`

Email notifications:

`2,000`

SMS:

`500`

WhatsApp messages:

`1,000`

Each channel must have its own configurable limit.

---

# 16. CUSTOMER CAMPAIGN LIMIT

Allow Admin to configure:

Campaigns per month

Recipients per campaign

Total recipients per month

Example:

Campaign limit:

`10/month`

Maximum recipients per campaign:

`2,000`

Monthly recipients:

`10,000`

---

# 17. ADVERTISEMENT LIMIT

Admin can configure:

Advertisements total

Advertisements per month

Active advertisements

Advertisement duration

Example:

Maximum active advertisements:

`5`

Maximum advertisements/month:

`20`

---

# 18. QR CODE LIMIT

Admin can configure:

Number of QR codes

Number of active QR campaigns

QR scan tracking availability

---

# 19. ANALYTICS LIMIT

Admin can decide whether a shop has access to:

Basic analytics

Advanced analytics

Real-time analytics

Customer analytics

Product analytics

Traffic analytics

Export analytics

Historical analytics

Example:

FREE:

Last 7 days

PRO:

Last 90 days

BUSINESS:

Unlimited history

---

# 20. FEATURE TOGGLES

Every shop must have configurable feature access.

Admin can turn ON/OFF:

- Products
- Images
- Videos
- Posts
- Stories
- Advertisements
- Offers
- Collections
- Likes
- Favorites
- Followers
- Customer accounts
- Enquiries
- WhatsApp
- Call button
- Directions
- Analytics
- QR code
- PWA
- Custom domain
- Notifications
- Email marketing
- SMS marketing
- WhatsApp marketing
- Advanced analytics
- API access

---

# 21. UNLIMITED OPTION

Every numerical limit must support:

`Unlimited`

Example:

Image limit:

Unlimited

Video limit:

Unlimited

Products:

Unlimited

Customers:

Unlimited

This should be represented in the database as a safe explicit value such as:

`null`

or

`-1`

Choose one consistent implementation.

---

# 22. PLAN-BASED LIMITS

Create subscription plans.

Example:

FREE

Images: 100

Videos: 10

Products: 50

Customers: 500

Storage: 2 GB

Posts: 50/month

Advertisements: 2/month

STARTER

Images: 500

Videos: 50

Products: 250

Customers: 2,000

Storage: 10 GB

Posts: 200/month

Advertisements: 10/month

PROFESSIONAL

Images: 2,000

Videos: 200

Products: 1,000

Customers: 10,000

Storage: 50 GB

Posts: 1,000/month

Advertisements: 50/month

BUSINESS

Images: Unlimited

Videos: Unlimited

Products: Unlimited

Customers: Unlimited

Storage: 250 GB

Posts: Unlimited

Advertisements: Unlimited

IMPORTANT:

These are only default examples.

Admin must be able to change every value.

---

# 23. INDIVIDUAL SHOP OVERRIDE

This is extremely important.

Admin must be able to override plan limits for an individual shop.

Example:

Shop is on PRO plan.

PRO:

Images = 2,000

But Admin can set:

Royal Jewellers:

Images = 5,000

Videos = 500

Customers = 25,000

Storage = 100 GB

The individual override takes priority over the plan limit.

Priority:

INDIVIDUAL SHOP LIMIT

>

PLAN LIMIT

>

PLATFORM DEFAULT

---

# 24. TEMPORARY LIMIT OVERRIDE

Allow Admin to create temporary overrides.

Example:

Royal Jewellers

Extra images:

+500

Valid until:

31 December 2026

After expiry:

Automatically return to normal limit.

Fields:

Override type

Value

Start date

End date

Reason

Created by

---

# 25. LIMIT RESET

Admin can configure whether limits reset:

Daily

Weekly

Monthly

Billing cycle

Never

For example:

Daily image upload limit:

50/day

Monthly post limit:

200/month

Total image storage:

Never resets

---

# 26. USAGE DASHBOARD

Admin should see every shop's resource usage.

Table:

| Shop            |   Images | Videos |   Storage | Products | Customers |  Messages |
| --------------- | -------: | -----: | --------: | -------: | --------: | --------: |
| Royal Jewellers | 600/1000 | 60/100 | 2.4/10 GB |  327/500 | 3450/5000 | 1340/2000 |

Use color/status indicators:

Healthy

Warning

Near limit

Limit reached

Suspended

---

# 27. WARNING THRESHOLDS

Admin can configure warning percentages.

Default:

70% = Warning

85% = High usage

95% = Critical

100% = Limit reached

Send notification to shop owner.

---

# 28. SHOP LIMIT PAGE

Shop owner dashboard must show:

Storage

Images

Videos

Products

Posts

Stories

Customers

Messages

Advertisements

Notifications

Example:

YOUR USAGE

Images
600 / 1,000

Videos
60 / 100

Storage
2.4 GB / 10 GB

Products
327 / 500

Customers
3,450 / 5,000

Messages
1,340 / 2,000

Use progress bars.

---

# 29. BLOCKING LOGIC

When a limit is reached:

Do NOT crash the application.

Do NOT allow the operation.

Return a clear API error:

{
"success": false,
"code": "LIMIT_REACHED",
"resource": "images",
"message": "You have reached your image upload limit."
}

Frontend displays:

"Image limit reached"

"Upgrade your plan or contact support."

---

# 30. LIMIT CHECK SERVICE

Create a centralized backend service:

`LimitService`

Functions:

checkLimit()

canUploadImage()

canUploadVideo()

canCreateProduct()

canCreatePost()

canCreateStory()

canCreateCustomer()

canSendMessage()

canSendNotification()

canCreateAdvertisement()

canUseFeature()

getUsage()

getRemaining()

incrementUsage()

decrementUsage()

Do NOT duplicate limit logic throughout controllers.

---

# 31. USAGE COUNTERS

Maintain efficient usage counters.

Possible model:

ShopUsage

Fields:

shopId

imagesUsed

videosUsed

storageUsedBytes

productsUsed

postsUsed

storiesUsed

customersUsed

messagesUsed

advertisementsUsed

notificationsUsed

whatsappMessagesUsed

updatedAt

Use atomic database operations where necessary.

Avoid expensive full database counting on every request.

---

# 32. MEDIA USAGE

When uploading media:

1. Check image/video limit.
2. Check storage limit.
3. Generate R2 signed URL.
4. Upload.
5. Verify upload.
6. Update usage counter.
7. Store media record.

When deleting media:

1. Delete R2 object.
2. Delete media record.
3. Decrease usage counter.

Prevent negative counters.

---

# 33. CUSTOMER LIMIT

Customer creation must check:

canCreateCustomer(shopId)

If limit reached:

Reject creation.

Existing customers must remain accessible.

Do not delete customers automatically.

---

# 34. MESSAGE LIMIT

Before creating an enquiry:

check:

canReceiveMessage(shopId)

If limit reached:

Show customer:

"This shop is currently unavailable for new enquiries."

Notify shop owner that the message limit has been reached.

Admin should be able to override this behavior.

---

# 35. ADMIN EMERGENCY CONTROLS

Admin must be able to instantly:

Suspend shop

Disable uploads

Disable videos

Disable customer enquiries

Disable advertisements

Disable notifications

Disable public shop

Disable customer registration

Disable specific features

These should be immediate.

---

# 36. SHOP STATUS

Possible statuses:

ACTIVE

TRIAL

SUSPENDED

PAUSED

PENDING_APPROVAL

EXPIRED

DELETED

When suspended:

Public shop behavior must follow configurable admin policy.

---

# 37. PLAN MANAGEMENT

Admin can create/edit/delete plans.

Plan fields:

name

slug

description

monthlyPrice

yearlyPrice

currency

features

limits

storageLimit

imageLimit

videoLimit

productLimit

customerLimit

messageLimit

postLimit

storyLimit

advertisementLimit

notificationLimit

isActive

isPopular

sortOrder

---

# 38. PLAN COMPARISON

Admin should have a visual plan editor.

Example:

```
          FREE   STARTER   PRO   BUSINESS
```

Images 100 500 2000 Unlimited

Videos 10 50 200 Unlimited

Products 50 250 1000 Unlimited

Customers 500 2000 10000 Unlimited

Storage 2GB 10GB 50GB 250GB

Messages 100 500 2000 Unlimited

---

# 39. FEATURE MATRIX

Admin can configure whether each plan receives each feature.

Example:

| Feature       | Free  | Starter | Pro      | Business |
| ------------- | ----- | ------- | -------- | -------- |
| Images        | ✓     | ✓       | ✓        | ✓        |
| Videos        | ✓     | ✓       | ✓        | ✓        |
| Stories       | ✗     | ✓       | ✓        | ✓        |
| Analytics     | Basic | Basic   | Advanced | Advanced |
| Custom Domain | ✗     | ✗       | ✓        | ✓        |
| WhatsApp      | ✓     | ✓       | ✓        | ✓        |
| Notifications | ✗     | ✓       | ✓        | ✓        |
| API           | ✗     | ✗       | ✓        | ✓        |

Everything must be configurable by Admin.

---

# 40. BILLING CYCLE

Support:

Monthly

Yearly

Custom

Limits can be reset based on:

Calendar month

Subscription renewal date

Admin-configured billing cycle

---

# 41. LIMIT HISTORY

Store every limit change.

Audit log:

Admin

Shop

Old value

New value

Resource

Reason

Timestamp

Example:

Admin changed:

Images

2000 → 5000

Reason:

"Premium customer upgrade"

---

# 42. ADMIN SEARCH

Admin should be able to search:

Shop name

Owner name

Email

Phone

Shop ID

Plan

Status

Filter:

Near limit

Limit reached

Suspended

High storage usage

High traffic

---

# 43. HIGH USAGE ALERTS

Admin dashboard should highlight shops consuming unusually high:

Storage

Bandwidth

Requests

Customer messages

Notifications

Media

This is important for controlling SaaS costs.

---

# 44. COST CONTROL

Show estimated resource consumption per shop.

Example:

Royal Jewellers

Storage:

2.4 GB

Images:

600

Videos:

60

Estimated media storage cost:

$0.XX

This allows the platform owner to understand which shops consume the most resources.

---

# 45. ADMIN SETTINGS

Create:

`/admin/settings/limits`

Admin can configure platform defaults:

Default image limit

Default video limit

Default storage

Default product limit

Default customer limit

Default message limit

Default warning percentage

Default upload size

Default video size

Default daily limits

Default monthly limits

---

# 46. API SECURITY

Never trust limits sent from frontend.

Bad:

POST /products

{
"limit": 999999
}

Never accept limits from shop owners.

Only Admin can change limits.

Backend must always retrieve the effective limit from database.

---

# 47. EFFECTIVE LIMIT CALCULATION

Create:

`getEffectiveLimit(shopId, resource)`

Logic:

1. Check individual shop override.
2. If no override, check subscription plan.
3. If no plan limit, check platform default.
4. If unlimited, allow.
5. Otherwise compare current usage.

Example:

Platform:

100 images

Plan:

500 images

Shop override:

2000 images

Effective:

2000 images

---

# 48. ADMIN UI REQUIREMENT

Admin UI should look like a professional SaaS control center.

Use:

Next.js

TypeScript

Tailwind

shadcn/ui

Responsive tables

Charts

Cards

Tabs

Modals

Drawers

Confirmation dialogs

Search

Filters

Pagination

Bulk actions

Toast notifications

---

# 49. IMPORTANT

The Admin must NOT need to edit code to change:

- Image limits
- Video limits
- Storage limits
- Product limits
- Customer limits
- Message limits
- Advertisement limits
- Notification limits
- Post limits
- Story limits
- Feature availability
- Plan limits

Everything must be configurable from the Admin UI.

---

# 50. FINAL ADMIN EXPERIENCE

The Admin should be able to open:

ADMIN → SHOPS → ROYAL JEWELLERS → LIMITS

and see:

## RESOURCE LIMITS

Images
600 / 2,000
[Edit]

Videos
60 / 500
[Edit]

Storage
2.4 GB / 100 GB
[Edit]

Products
327 / 2,000
[Edit]

Customers
3,450 / 25,000
[Edit]

Messages
1,340 / 10,000
[Edit]

Advertisements
5 / 50
[Edit]

Notifications
2,400 / 10,000
[Edit]

## FEATURES

Products ON
Images ON
Videos ON
Stories ON
Analytics ON
WhatsApp ON
Notifications ON
API OFF

## ACTIONS

[Save Changes]

[Add Temporary Limit]

[Suspend Shop]

[Disable Uploads]

[Reset Usage]

[View Audit Log]

---

# FINAL REQUIREMENT

Build this as a **real SaaS entitlement and quota management system**, not a simple UI.

The backend must enforce every limit.

The frontend must display every limit.

The Admin must be able to configure every limit.

The shop owner must always see their current usage and remaining quota.

The system must support:

**Plan limits + Individual shop overrides + Temporary overrides + Feature flags + Usage tracking + Daily/monthly quotas + Storage quotas + Admin emergency controls + Audit logs.**

The entire system must be scalable and ready for thousands of jewellery shops.
