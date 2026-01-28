import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { username, email, password } = await req.json()

    if (!username || !email || !password) {
      return new Response(
        JSON.stringify({ error: '用户名、邮箱和密码不能为空' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: '密码至少需要6个字符' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create Supabase admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Check if email already exists
    const { data: existingUsers, error: checkError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .limit(1)

    if (checkError) {
      console.error('Check existing user error:', checkError)
    }

    if (existingUsers && existingUsers.length > 0) {
      return new Response(
        JSON.stringify({ error: '该邮箱已被注册' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check if username already exists
    const { data: existingUsername, error: usernameCheckError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('username', username)
      .limit(1)

    if (usernameCheckError) {
      console.error('Check existing username error:', usernameCheckError)
    }

    if (existingUsername && existingUsername.length > 0) {
      return new Response(
        JSON.stringify({ error: '该用户名已被使用' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Create user using Supabase Auth Admin API
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto confirm email
      user_metadata: {
        username
      }
    })

    if (authError) {
      console.error('Auth create user error:', authError)
      return new Response(
        JSON.stringify({ error: authError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // The trigger should auto-create profile, but let's verify
    if (authData.user) {
      console.log('User created successfully:', authData.user.id)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: {
          id: authData.user?.id,
          email: authData.user?.email
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error: unknown) {
    console.error('Create user error:', error)
    const errorMessage = error instanceof Error ? error.message : '创建用户失败'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
