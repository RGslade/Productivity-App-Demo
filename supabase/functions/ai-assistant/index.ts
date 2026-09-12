const OPENAI_BASE_URL = 'https://api.openai.com/v1';

interface OpenAIModel {
  id: string;
  owned_by?: string;
}

function jsonResponse(payload: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  });
}

async function callOpenAI(path: string, options: RequestInit = {}): Promise<any> {
  const apiKey = Deno.env.get('OPENAI_API_KEY');

  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY function secret.');
  }

  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${apiKey}`);
  headers.set('Content-Type', 'application/json');

  const response = await fetch(`${OPENAI_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI request failed (${response.status}): ${errorBody}`);
  }

  return response.json();
}

function hasDateInModelId(modelId: string): boolean {
  return (
    /\d{4}-\d{2}-\d{2}/.test(modelId) ||
    /\d{4}-\d{2}-\d{2}$/.test(modelId)
  );
}

function filterModels(models: OpenAIModel[]): string[] {
  const filteredModels = models
    .filter((model) => {
      const id = model.id.toLowerCase();

      return (
        id.startsWith('gpt-') &&
        !model.owned_by?.toLowerCase().includes('openai') &&
        !id.includes('preview') &&
        !id.includes('codex') &&
        !id.includes('image') &&
        !id.includes('audio') &&
        !id.includes('tts') &&
        !id.includes('search') &&
        !id.includes('transcribe') &&
        !id.includes('instruct') &&
        !id.includes('latest') &&
        !id.includes('5.5') &&
        !id.includes('pro') &&
        !id.includes('realtime') &&
        !id.includes('turbo') &&
        !hasDateInModelId(id)
      );
    })
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((model) => model.id);

  return ['None', ...filteredModels];
}

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const payload = await request.json();
    const { action } = payload ?? {};

    if (!action) {
      return jsonResponse({ error: 'Missing action' }, 400);
    }

    if (action === 'create_conversation') {
      const conversation = await callOpenAI('/conversations', {
        method: 'POST',
        body: JSON.stringify({
          metadata: { timestamp: new Date().toISOString() },
        }),
      });

      return jsonResponse({ conversationId: conversation.id });
    }

    if (action === 'list_models') {
      const modelsResponse = await callOpenAI('/models', { method: 'GET' });
      const models = Array.isArray(modelsResponse?.data)
        ? (modelsResponse.data as OpenAIModel[])
        : [];

      return jsonResponse({ models: filterModels(models) });
    }

    if (action === 'send_message') {
      const { model, conversationId, message, instructions } = payload;

      if (!model || !conversationId || !message || !instructions) {
        return jsonResponse({ error: 'Missing required send_message fields' }, 400);
      }

      const aiResponse = await callOpenAI('/responses', {
        method: 'POST',
        body: JSON.stringify({
          instructions,
          model,
          conversation: conversationId,
          input: message,
          metadata: {
            timestamp: new Date().toISOString(),
          },
        }),
      });

      return jsonResponse(aiResponse);
    }

    return jsonResponse({ error: 'Invalid action' }, 400);
  } catch (error) {
    console.error('lifenest-ai function error:', error);
    return jsonResponse(
      {
        error: error instanceof Error ? error.message : 'Unknown server error',
      },
      500,
    );
  }
});
