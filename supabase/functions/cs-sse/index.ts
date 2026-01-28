import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import * as djwt from "https://deno.land/x/djwt@v2.8/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-agent-token',
};

const AGENT_JWT_SECRET = Deno.env.get('ADMIN_JWT_SECRET') || 'super-secret-jwt-key';

async function verifyAgentToken(token: string): Promise<any | null> {
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(AGENT_JWT_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"],
    );

    const payload = await djwt.verify(token, key);
    if ((payload as any)?.type !== 'cs_agent') return null;
    return payload;
  } catch {
    return null;
  }
}

function sseHeaders(extra: Record<string, string> = {}) {
  return {
    ...corsHeaders,
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    ...extra,
  };
}

function writeEvent(controller: ReadableStreamDefaultController<Uint8Array>, evt: { event: string; data?: unknown; id?: string }) {
  const encoder = new TextEncoder();
  let out = '';
  if (evt.id) out += `id: ${evt.id}\n`;
  out += `event: ${evt.event}\n`;
  if (evt.data !== undefined) {
    const payload = typeof evt.data === 'string' ? evt.data : JSON.stringify(evt.data);
    // SSE supports multi-line data; keep it simple
    for (const line of payload.split('\n')) {
      out += `data: ${line}\n`;
    }
  } else {
    out += `data: {}\n`;
  }
  out += '\n';
  controller.enqueue(encoder.encode(out));
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const topic = url.searchParams.get('topic') || 'messages';
  const conversationId = url.searchParams.get('conversation_id');
  const since = url.searchParams.get('since');
  const sinceRead = url.searchParams.get('since_read');

  if (topic !== 'messages') {
    return new Response(JSON.stringify({ error: '未知topic' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!conversationId) {
    return new Response(JSON.stringify({ error: '缺少conversation_id' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const supabase = createClient(supabaseUrl, serviceKey);

    // Auth: agent (x-agent-token) OR user (Authorization)
    const agentToken = req.headers.get('x-agent-token');
    const authHeader = req.headers.get('authorization');

    let agent: any | null = null;
    let user: any | null = null;

    if (agentToken) {
      agent = await verifyAgentToken(agentToken);
      if (!agent) {
        return new Response(JSON.stringify({ error: '无效的客服令牌' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Validate agent can access conversation
      const { data: conv, error: convErr } = await supabase
        .from('cs_conversations')
        .select('id, agent_id, status, is_ai_mode')
        .eq('id', conversationId)
        .single();

      if (convErr || !conv) {
        return new Response(JSON.stringify({ error: '对话不存在' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Agent can access:
      // 1. Their own active conversations (agent_id matches)
      // 2. Waiting conversations (status = 'waiting', agent_id is null)
      // 3. AI mode active conversations (for takeover)
      const isOwnConversation = conv.agent_id === agent.agent_id;
      const isWaiting = conv.status === 'waiting' && !conv.agent_id;
      const isAiModeTakeable = conv.status === 'active' && conv.is_ai_mode === true;
      
      if (!isOwnConversation && !isWaiting && !isAiModeTakeable) {
        return new Response(JSON.stringify({ error: '无权限访问该对话' }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    } else {
      if (!authHeader) {
        return new Response(JSON.stringify({ error: '请先登录' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });

      const { data: authData, error: authErr } = await userClient.auth.getUser();
      user = authData?.user ?? null;

      if (authErr || !user) {
        return new Response(JSON.stringify({ error: '用户未认证' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Validate user owns conversation
      const { data: conv, error: convErr } = await supabase
        .from('cs_conversations')
        .select('id')
        .eq('id', conversationId)
        .eq('user_id', user.id)
        .single();

      if (convErr || !conv) {
        return new Response(JSON.stringify({ error: '对话不存在' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const maxRuntimeMs = 55_000; // client auto-reconnects
    const startedAt = Date.now();

    let cursorCreatedAt = since || new Date(Date.now() - 30_000).toISOString();
    let cursorReadAt = sinceRead || new Date(Date.now() - 5 * 60_000).toISOString();

    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        writeEvent(controller, { event: 'ready', data: { ok: true } });

        const abortHandler = () => {
          try {
            writeEvent(controller, { event: 'end', data: { ok: true } });
          } catch {
            // ignore
          }
          try {
            controller.close();
          } catch {
            // ignore
          }
        };

        req.signal.addEventListener('abort', abortHandler);

        (async () => {
          try {
            while (!req.signal.aborted && Date.now() - startedAt < maxRuntimeMs) {
              // New messages
              const { data: newMessages, error: newErr } = await supabase
                .from('cs_messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .gt('created_at', cursorCreatedAt)
                .order('created_at', { ascending: true })
                .limit(50);

              if (newErr) throw newErr;

              for (const m of newMessages ?? []) {
                cursorCreatedAt = m.created_at;
                writeEvent(controller, { event: 'message', data: m, id: m.id });
              }

              // Read status updates (read_at changes)
              const { data: readUpdates, error: readErr } = await supabase
                .from('cs_messages')
                .select('*')
                .eq('conversation_id', conversationId)
                .not('read_at', 'is', null)
                .gt('read_at', cursorReadAt)
                .order('read_at', { ascending: true })
                .limit(50);

              if (readErr) throw readErr;

              for (const m of readUpdates ?? []) {
                if (m.read_at) cursorReadAt = m.read_at;
                writeEvent(controller, { event: 'message_update', data: m, id: m.id });
              }

              // keep-alive
              writeEvent(controller, { event: 'ping', data: { t: Date.now() } });
              await sleep(1500);
            }
          } catch (err) {
            console.error('cs-sse loop error:', err);
            try {
              writeEvent(controller, {
                event: 'error',
                data: {
                  message: err instanceof Error ? err.message : 'stream error',
                },
              });
            } catch {
              // ignore
            }
          } finally {
            try {
              controller.close();
            } catch {
              // ignore
            }
          }
        })();
      },
    });

    return new Response(stream, { headers: sseHeaders() });
  } catch (error) {
    console.error('Error in cs-sse:', error);
    const errorMessage = error instanceof Error ? error.message : '操作失败';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
