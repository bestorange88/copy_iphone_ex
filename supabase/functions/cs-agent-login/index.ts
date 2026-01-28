import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as djwt from "https://deno.land/x/djwt@v2.8/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // SECURITY: Fail securely if JWT secret is not configured
    const AGENT_JWT_SECRET = Deno.env.get('ADMIN_JWT_SECRET')
    if (!AGENT_JWT_SECRET) {
      console.error('CRITICAL: ADMIN_JWT_SECRET environment variable is not configured')
      return new Response(
        JSON.stringify({ error: '服务器配置错误，请联系管理员' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { username, password } = await req.json()

    if (!username || !password) {
      return new Response(
        JSON.stringify({ error: '请输入用户名和密码' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Verify agent credentials
    const { data: agentData, error: verifyError } = await supabase
      .rpc('verify_agent_password', { _username: username, _password: password })

    if (verifyError || !agentData || agentData.length === 0) {
      console.error('Agent login failed:', verifyError)
      return new Response(
        JSON.stringify({ error: '用户名或密码错误' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const agent = agentData[0]

    // Generate JWT token
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(AGENT_JWT_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    )

    const token = await djwt.create(
      { alg: "HS256", typ: "JWT" },
      {
        agent_id: agent.agent_id,
        username: agent.agent_username,
        display_name: agent.agent_display_name,
        type: 'cs_agent',
        exp: djwt.getNumericDate(60 * 60 * 8) // 8 hours
      },
      key
    )

    // Get full agent info
    const { data: fullAgent } = await supabase
      .from('cs_agents')
      .select('id, username, display_name, avatar_url, max_conversations')
      .eq('id', agent.agent_id)
      .single()

    console.log('Agent logged in:', agent.agent_username)

    return new Response(
      JSON.stringify({
        success: true,
        token,
        agent: fullAgent
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in cs-agent-login:', error)
    return new Response(
      JSON.stringify({ error: '登录失败，请稍后重试' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})