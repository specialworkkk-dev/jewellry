This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Realtime customer and owner updates

Realtime catalogue, shop-setting, gold-rate, enquiry, and favourite updates use
Ably with short-lived, capability-scoped tokens. Add the server-side key locally
and to the Vercel Production environment:

```bash
ABLY_API_KEY=your-app-id.your-key-id:your-key-secret
```

The key must have publish and token-request capabilities. Never prefix it with
`NEXT_PUBLIC_` or expose it in browser code. Customer tokens can only subscribe
to that shop's public channel; authenticated owners can only subscribe to their
own owner channel. If the key or provider is unavailable, database operations
continue normally and connected clients fall back to conservative refreshes.

## Shop-specific customer push notifications

Customers can explicitly opt in to browser notifications for an individual
shop. Successful product publication, catalogue posts, stories, gold-rate
updates, and storefront-image updates can then notify only that shop's
subscribers. Owners can enable or disable each event and choose or customize
one of 50 reusable notification templates under Dashboard → Settings.

Generate a VAPID key pair once:

```bash
npm run generate:vapid
```

Add these values to `.env.local` and the Vercel Production environment, then
redeploy:

```bash
NEXT_PUBLIC_VAPID_PUBLIC_KEY=generated_public_key
VAPID_PRIVATE_KEY=generated_private_key
VAPID_SUBJECT=mailto:support@your-domain.example
```

The public key is intentionally available to browsers. The private key must
remain server-side and must never use a `NEXT_PUBLIC_` prefix.
