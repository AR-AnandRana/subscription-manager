# Wallos — Next.js + Supabase

A rebuild of [Wallos](https://github.com/ellite/Wallos), the open source personal
subscription tracker, on Next.js (App Router) and Supabase.

The design is not an approximation: this app serves Wallos's own stylesheets,
fonts, icons and payment-method images unchanged from `public/`, and the React
components render the same class names as the PHP templates. The calculations —
monthly-equivalent pricing, billing-cycle progress, budget periods, statistics —
are line-by-line ports of the PHP, not re-derivations.

---

## Setup

### 1. Create a Supabase project

At [supabase.com](https://supabase.com), create a project and note its URL and
anon key (Project Settings → API).

### 2. Run the migrations

Quickest: open the project's **SQL Editor**, paste all of
`supabase/setup.sql`, and run it once. That file is the four migrations below
concatenated in order.

Or apply them individually:

| File | What it does |
| --- | --- |
| `supabase/migrations/0001_schema.sql` | Tables, mirroring the SQLite schema |
| `supabase/migrations/0002_rls.sql` | Row level security on every table |
| `supabase/migrations/0003_seed_new_user.sql` | Per-account seed data + trigger |
| `supabase/migrations/0004_storage.sql` | `logos` and `avatars` buckets |
| `supabase/migrations/0005_admin.sql` | SMTP, OIDC and security settings, plus the admin functions |

### Optional: the service role key

Two things need more than a signed-in user's rights: creating an account from
the Admin page, and the maintenance jobs that run across every account. Set
`SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API) in the **server**
environment — Netlify → Environment variables, or `.env.local` locally.

Never prefix it `NEXT_PUBLIC_`. That key bypasses row level security entirely,
so it must never reach the browser. Everything else works without it.

### If the Admin tab is missing

The first account to register becomes the admin. If an install somehow ends up
with no admin — the first account was deleted, or accounts predate the trigger —
the app promotes the earliest remaining account on next load. To hand admin to a
specific account instead, run this in the SQL editor:

```sql
update public.profiles set is_admin = true where email = 'you@example.com';
```

With the CLI:

```bash
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

> **Running Supabase locally needs Docker.** `supabase start` boots Postgres,
> GoTrue, PostgREST, Realtime, Storage and Kong as containers; there is no
> Docker-free local mode. A bare local Postgres is not enough either — this app
> talks to Auth, PostgREST and Storage, not just the database. Without Docker,
> use a hosted project (the free tier is plenty).

### 3. Configure the app

```bash
cp .env.example .env.local
```

Fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key>
```

### 4. Run it

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. Register an account — the first one to register
becomes the admin, matching upstream's `userId == 1` rule. Registration seeds
that account with Wallos's 34 currencies, 17 categories, 31 payment methods and
a household member, exactly as `createdatabase.php` does for a fresh install.

---

## Deploying to Netlify

Netlify detects Next.js and applies its OpenNext adapter automatically, with no
plugin to install. [`netlify.toml`](netlify.toml) only pins the Node version and
sets cache headers for Wallos's static assets.

> **Why there is no `proxy.ts` (middleware).** Netlify's adapter
> (`@netlify/plugin-nextjs` 5.15.13) cannot bundle a Next.js 16 proxy: the build
> succeeds, then Edge Functions bundling fails with
> `Cannot find module './chunks/[turbopack]_runtime.js'` (or
> `./webpack-runtime.js` under webpack). So auth is checked on the server
> instead — the `(app)` layout redirects signed-out users to `/login`, and the
> login and register pages redirect signed-in users home. The browser Supabase
> client keeps the session cookie refreshed. Once the adapter supports Next 16
> proxies, a proxy can come back for token refresh at the edge.

### 1. Push the repo

Netlify builds from a git remote, so `wallos-next/` needs to be on GitHub,
GitLab or Bitbucket:

```bash
git add -A
git commit -m "Wallos on Next.js and Supabase"
git remote add origin <your-repo-url>
git push -u origin master
```

No git host? Deploy straight from this folder instead:

```bash
npx netlify-cli deploy --build --prod
```

### 2. Connect the site

In Netlify: **Add new site → Import an existing project**, pick the repo, and
leave the build settings as detected. If the repo root is the *parent* folder
rather than `wallos-next/`, set **Base directory** to `wallos-next`.

### 3. Set the environment variables

**Site configuration → Environment variables**, add both:

| Key | Value |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your anon key |

These are `NEXT_PUBLIC_`, so they are compiled into the browser bundle — that is
correct and expected. The anon key is designed to be public; row level security
is what protects the data. Never put the `service_role` key here.

They are read at **build** time, so set them before the first build, and
redeploy after changing either.

### 4. Point Supabase at the deployed URL

This is the step that is easy to miss — without it, login works locally but
password reset and email links break in production.

In Supabase: **Authentication → URL Configuration**

- **Site URL** — `https://<your-site>.netlify.app`
- **Redirect URLs** — add both:
  - `https://<your-site>.netlify.app/**`
  - `http://localhost:3000/**` (so local development keeps working)

The password reset flow sends users to `/auth/update-password` on whatever
origin they started from, and Supabase refuses redirects to origins that are not
on that list.

### 5. Deploy previews

Each pull request gets its own URL. Those origins are not in the Supabase
redirect list, so auth flows will not complete on a preview unless you add
`https://deploy-preview-*--<your-site>.netlify.app/**` to **Redirect URLs**.

---

## How it maps to upstream

### Database

`user` becomes `profiles`, keyed by `auth.users.id` (a uuid) rather than an
autoincrement integer, because Supabase Auth owns identity. Passwords,
`login_tokens`, `email_verification`, `password_resets` and `totp` therefore
have no tables here — Supabase Auth handles all of them.

Every other table keeps its integer surrogate key, so subscriptions still
reference categories and payment methods by integer as upstream does, and gains
a `user_id uuid`. Wallos is single-tenant per install and scopes every query
with `WHERE user_id = :userId`; here that scoping is enforced by row level
security instead, so a compromised client cannot read another tenant's rows.

`cycles` and `frequencies` are static lookup tables upstream whose rows never
change, so they live in `src/lib/constants.ts` instead.

`order` is reserved in Postgres, so `categories.order` and
`payment_methods.order` are `sort_order`.

### Scheduled jobs

Upstream runs cron jobs for renewals, notifications, exchange rates and update
checks. Two of those matter to correctness rather than delivery:

- **Renewals** (`updatenextpayment`) are handled on read. `syncOverdueRenewals()`
  rolls any overdue auto-renewing subscription forward when the subscriptions
  page loads, writing only when something is actually stale. Manual-renewal
  subscriptions are untouched — they only move when the user clicks Renew, which
  is the behaviour upstream's `auto_renew = 1` filter produces.
- **Exchange rates** are not fetched. Rates are stored per currency and editable
  in Settings → Currencies; a rate of 1 leaves prices unconverted.

### Notifications

The settings screen stores configuration for every channel Wallos supports
(email, Discord, Telegram, Gotify, ntfy, Pushover, Mattermost, PushPlus,
ServerChan, webhooks). Sending is not implemented: it needs a server that can
reach SMTP and arbitrary webhook hosts, which a browser client cannot do. To
deliver, add a Supabase Edge Function on a schedule that reads
`notification_settings` plus the channel tables and sends. The schema is ready
for it.

### Admin

`admin_settings` is readable by any signed-in user (the registration page needs
to know whether registrations are open) and writable only by an admin profile.
Listing and deleting *other* users needs the service role key, which must never
reach the browser, so user management is not in the client. Add a server route
holding `SUPABASE_SERVICE_ROLE_KEY` if you need it.

Registration limits and email verification are enforced by Supabase Auth, so set
those in the Supabase dashboard as well as here.

### Uploads

Logos and avatars go to Supabase Storage rather than `images/uploads/`. Both
buckets are public to read — a logo appears on every card, so signing each URL
would cost a round trip for no privacy gain — and writable only by the owner,
whose id is the first path segment.

Upstream's automatic background removal and themed logo variants (which recolour
a black- or white-ink logo so it stays legible on the opposite theme) are a
server-side GD image pipeline. The *rendering* side is ported —
`SubscriptionLogo` shows both files and lets CSS pick — but variants are not
generated, so `logo_variant` stays null for new uploads.

---

## Layout

```
src/
  app/
    (app)/            signed-in pages; serves styles.css
    (auth)/           login, register, password reset; serves login.css
  components/
    pages/            one component per screen
    settings/         the settings sections
    Icons.tsx         generated from Wallos's SVGs
  lib/
    subscriptions.ts  pricing, progress, occurrence walking
    stats.ts          the statistics engine
    budget.ts         budget period arithmetic
    dates.ts          local-midnight date handling
supabase/migrations/  schema, RLS, seed, storage
scripts/verify-math.ts  checks the ports against known values
public/               Wallos's stylesheets, fonts and images, unchanged
```

Two root layouts exist on purpose. Upstream serves the signed-out pages with
`login.css` *instead of* `styles.css`, and the two define conflicting rules for
41 shared selectors, so each route group gets its own `<html>`.

## Verifying the ports

```bash
npx tsx scripts/verify-math.ts
```

Checks monthly-equivalent pricing against the PHP switch, month-end clamping
(Jan 31 + 1 month is Feb 28), occurrence walking for both auto and manual
renewal, and weekly and monthly budget periods.
