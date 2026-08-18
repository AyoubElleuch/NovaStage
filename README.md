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

## Learn More

To learn more about Next.js, take a look at the following resources:


You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Database setup

For a fresh Supabase production project, run [supabase/schema.sql](supabase/schema.sql) once in the Supabase SQL Editor. It contains the complete current schema, seed data, triggers, and RLS policies.

For an existing project that already tracks the numbered migrations, keep using the migration workflow so Supabase preserves its migration history:

```bash
supabase db push
```

The numbered files in `supabase/migrations` are the incremental upgrade path. Do not run `schema.sql` against a database that already has those migrations applied unless you have reviewed the idempotent policy and trigger changes first.
