import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * Send a test notification, replacing endpoints/notifications/test*.php.
 *
 * The HTTP-based channels are sent from here. Email is not: it needs an SMTP
 * transport, which this deployment does not have, so it reports that plainly
 * rather than claiming success.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const { channel } = (await request.json()) as { channel?: string };
  if (!channel) return NextResponse.json({ error: 'Missing channel' }, { status: 400 });

  const { data: row } = await supabase.from(channel).select('*').eq('user_id', user.id).maybeSingle();
  if (!row) return NextResponse.json({ error: 'Channel is not configured' }, { status: 400 });

  const title = 'Wallos Notification';
  const message = "This is a test notification. If you're seeing this, the configuration is correct.";

  try {
    switch (channel) {
      case 'email_notifications':
        return NextResponse.json(
          {
            error:
              'Email needs an SMTP transport on the server, which this deployment does not have. ' +
              'The settings are saved and a scheduled function can use them.',
          },
          { status: 501 },
        );

      case 'discord_notifications':
        await post(row.webhook_url, {
          content: message,
          username: row.bot_username || undefined,
          avatar_url: row.bot_avatar_url || undefined,
        });
        break;

      case 'telegram_notifications':
        await post(`https://api.telegram.org/bot${row.bot_token}/sendMessage`, {
          chat_id: row.chat_id,
          text: `${title}\n${message}`,
        });
        break;

      case 'gotify_notifications':
        await post(`${String(row.url).replace(/\/$/, '')}/message?token=${row.token}`, {
          title,
          message,
        });
        break;

      case 'ntfy_notifications':
        await post(`${String(row.host).replace(/\/$/, '')}/${row.topic}`, message, {
          Title: title,
          'Content-Type': 'text/plain',
        });
        break;

      case 'pushover_notifications':
        await post('https://api.pushover.net/1/messages.json', {
          token: row.token,
          user: row.user_key,
          title,
          message,
        });
        break;

      case 'mattermost_notifications':
        await post(row.webhook_url, {
          text: message,
          username: row.bot_username || undefined,
          icon_emoji: row.bot_icon_emoji || undefined,
        });
        break;

      case 'pushplus_notifications':
        await post('https://www.pushplus.plus/send', {
          token: row.token,
          title,
          content: message,
        });
        break;

      case 'serverchan_notifications':
        await post(`https://sctapi.ftqq.com/${row.sendkey}.send`, { title, desp: message });
        break;

      case 'webhook_notifications': {
        const method = String(row.request_method || 'POST').toUpperCase();
        const headers = parseHeaders(String(row.headers ?? ''));
        const payload = String(row.payload ?? '').trim() || JSON.stringify({ message });
        const response = await fetch(String(row.url), {
          method,
          headers: { 'Content-Type': 'application/json', ...headers },
          body: method === 'GET' ? undefined : payload,
        });
        if (!response.ok) throw new Error(`Webhook returned HTTP ${response.status}`);
        break;
      }

      default:
        return NextResponse.json({ error: 'Unknown channel' }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Notification failed' },
      { status: 502 },
    );
  }
}

async function post(url: string, body: unknown, headers: Record<string, string> = {}) {
  if (!url) throw new Error('This channel has no URL configured');
  const isText = typeof body === 'string';
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': isText ? 'text/plain' : 'application/json', ...headers },
    body: isText ? body : JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Provider returned HTTP ${response.status}`);
}

/** Parse the "Name: value" lines the custom headers field accepts. */
function parseHeaders(raw: string): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const line of raw.split('\n')) {
    const index = line.indexOf(':');
    if (index < 0) continue;
    const name = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();
    if (name) headers[name] = value;
  }
  return headers;
}
