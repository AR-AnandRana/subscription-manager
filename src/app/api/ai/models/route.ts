import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * List the models an AI provider offers, replacing endpoints/ai/fetch_models.php.
 *
 * The request is made from the server so the provider key never travels from
 * the browser to a third party.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not signed in' }, { status: 401 });

  const { type, api_key: apiKey, url } = (await request.json()) as {
    type?: string;
    api_key?: string;
    url?: string;
  };

  try {
    switch (type) {
      case 'chatgpt': {
        const models = await listOpenAiModels('https://api.openai.com/v1/models', apiKey);
        return NextResponse.json({ models });
      }
      case 'openrouter': {
        const models = await listOpenAiModels('https://openrouter.ai/api/v1/models', apiKey);
        return NextResponse.json({ models });
      }
      case 'openai-compatible': {
        if (!url) return NextResponse.json({ error: 'Invalid Host' }, { status: 400 });
        const models = await listOpenAiModels(`${url.replace(/\/$/, '')}/models`, apiKey);
        return NextResponse.json({ models });
      }
      case 'ollama': {
        if (!url) return NextResponse.json({ error: 'Invalid Host' }, { status: 400 });
        const response = await fetch(`${url.replace(/\/$/, '')}/api/tags`);
        if (!response.ok) throw new Error(`Provider returned HTTP ${response.status}`);
        const body = (await response.json()) as { models?: { name: string }[] };
        return NextResponse.json({ models: (body.models ?? []).map((model) => model.name) });
      }
      case 'gemini': {
        if (!apiKey) return NextResponse.json({ error: 'API key required' }, { status: 400 });
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`,
        );
        if (!response.ok) throw new Error(`Provider returned HTTP ${response.status}`);
        const body = (await response.json()) as { models?: { name: string }[] };
        return NextResponse.json({
          models: (body.models ?? []).map((model) => model.name.replace(/^models\//, '')),
        });
      }
      default:
        return NextResponse.json({ error: 'Unknown provider' }, { status: 400 });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'AI provider error' },
      { status: 502 },
    );
  }
}

async function listOpenAiModels(endpoint: string, apiKey?: string): Promise<string[]> {
  if (!apiKey) throw new Error('API key required');
  const response = await fetch(endpoint, { headers: { Authorization: `Bearer ${apiKey}` } });
  if (!response.ok) throw new Error(`Provider returned HTTP ${response.status}`);
  const body = (await response.json()) as { data?: { id: string }[] };
  return (body.data ?? []).map((model) => model.id).sort();
}
