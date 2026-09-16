import { NextResponse } from 'next/server';
import { createAdminClient, requireAdmin, SERVICE_KEY_MISSING } from '@/lib/supabase/admin';

/**
 * Orphaned logo cleanup, replacing endpoints/admin/deleteunusedlogos.php.
 *
 * Upstream compares the uploads folder against the logos referenced in the
 * database. Here the folder is the `logos` storage bucket, and the comparison
 * spans every account, so it needs the service role key.
 */
export async function GET() {
  const result = await findOrphans();
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  return NextResponse.json({ count: result.orphans.length });
}

export async function DELETE() {
  const result = await findOrphans();
  if ('error' in result) return NextResponse.json({ error: result.error }, { status: result.status });
  if (result.orphans.length === 0) return NextResponse.json({ deleted: 0 });

  const { error } = await result.admin.storage.from('logos').remove(result.orphans);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ deleted: result.orphans.length });
}

type Found =
  | { admin: NonNullable<ReturnType<typeof createAdminClient>>; orphans: string[] }
  | { error: string; status: number };

async function findOrphans(): Promise<Found> {
  const auth = await requireAdmin();
  if (!auth.ok) return { error: auth.error, status: auth.status };

  const admin = createAdminClient();
  if (!admin) return { error: SERVICE_KEY_MISSING, status: 501 };

  const [{ data: subscriptions }, { data: paymentMethods }, { data: profiles }] = await Promise.all([
    admin.from('subscriptions').select('logo, logo_variant'),
    admin.from('payment_methods').select('icon'),
    admin.from('profiles').select('id'),
  ]);

  const referenced = new Set<string>();
  for (const subscription of subscriptions ?? []) {
    for (const value of [subscription.logo, subscription.logo_variant]) {
      if (value) referenced.add(String(value).split('/').slice(-2).join('/'));
    }
  }
  for (const method of paymentMethods ?? []) {
    if (method.icon) referenced.add(String(method.icon).split('/').slice(-2).join('/'));
  }

  // Objects live under <user id>/<file>, so each account's folder is listed.
  const orphans: string[] = [];
  for (const profile of profiles ?? []) {
    const { data: files } = await admin.storage.from('logos').list(profile.id, { limit: 1000 });
    for (const file of files ?? []) {
      const key = `${profile.id}/${file.name}`;
      if (!referenced.has(key)) orphans.push(key);
    }
  }

  return { admin, orphans };
}
