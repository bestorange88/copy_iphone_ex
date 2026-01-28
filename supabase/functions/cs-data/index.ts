import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as djwt from "https://deno.land/x/djwt@v2.8/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-agent-token, x-admin-token',
}

async function verifyAgentToken(token: string, secret: string): Promise<any> {
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"]
    )
    const payload = await djwt.verify(token, key)
    if (payload.type !== 'cs_agent') {
      return null
    }
    return payload
  } catch {
    return null
  }
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
        JSON.stringify({ error: '服务器配置错误' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    const { action, ...data } = await req.json()

    // Check for agent token or admin token
    const agentToken = req.headers.get('x-agent-token')
    const adminToken = req.headers.get('x-admin-token')

    let agent = null
    let isAdmin = false

    if (agentToken) {
      agent = await verifyAgentToken(agentToken, AGENT_JWT_SECRET)
      if (!agent) {
        return new Response(
          JSON.stringify({ error: '无效的客服令牌' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    } else if (adminToken) {
      // Verify admin token using same secret
      try {
        const key = await crypto.subtle.importKey(
          "raw",
          new TextEncoder().encode(AGENT_JWT_SECRET),
          { name: "HMAC", hash: "SHA-256" },
          false,
          ["sign", "verify"]
        )
        await djwt.verify(adminToken, key)
        isAdmin = true
      } catch {
        return new Response(
          JSON.stringify({ error: '无效的管理员令牌' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    // Some actions require authentication
    const authRequiredActions = [
      'get_conversations', 'get_messages', 'send_message', 'accept_conversation',
      'close_conversation', 'transfer_conversation', 'get_quick_replies',
      'mark_messages_read',
      'set_online_status', 'get_agents', 'create_agent', 'update_agent',
      'delete_agent', 'get_all_conversations', 'manage_quick_replies',
      'set_priority',
      'get_online_agents'
    ]

    if (authRequiredActions.includes(action) && !agent && !isAdmin) {
      return new Response(
        JSON.stringify({ error: '需要客服或管理员权限' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    switch (action) {
      // ===== Agent Management (Admin only) =====
      case 'get_agents': {
        const { data: agents, error } = await supabase
          .from('cs_agents')
          .select('*')
          .order('created_at', { ascending: false })
        
        if (error) throw error
        return new Response(
          JSON.stringify({ data: agents }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'create_agent': {
        if (!isAdmin) {
          return new Response(
            JSON.stringify({ error: '仅管理员可创建客服' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { username, password, display_name, avatar_url, max_conversations } = data

        // Hash password using the database function
        const { data: hashResult, error: hashError } = await supabase
          .rpc('hash_password', { _password: password })

        if (hashError) {
          console.error('Password hash error:', hashError)
          throw new Error('密码加密失败')
        }

        const { data: newAgent, error } = await supabase
          .from('cs_agents')
          .insert({
            username,
            password_hash: hashResult,
            display_name,
            avatar_url,
            max_conversations: max_conversations || 10
          })
          .select()
          .single()

        if (error) {
          if (error.code === '23505') {
            return new Response(
              JSON.stringify({ error: '用户名已存在' }),
              { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }
          throw error
        }

        return new Response(
          JSON.stringify({ data: newAgent }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'update_agent': {
        if (!isAdmin) {
          return new Response(
            JSON.stringify({ error: '仅管理员可修改客服' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { id, ...updateData } = data
        const { data: updated, error } = await supabase
          .from('cs_agents')
          .update(updateData)
          .eq('id', id)
          .select()
          .single()

        if (error) throw error
        return new Response(
          JSON.stringify({ data: updated }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'delete_agent': {
        if (!isAdmin) {
          return new Response(
            JSON.stringify({ error: '仅管理员可删除客服' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { error } = await supabase
          .from('cs_agents')
          .delete()
          .eq('id', data.id)

        if (error) throw error
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // ===== Conversation Management =====
      case 'get_conversations': {
        let query = supabase
          .from('cs_conversations')
          .select('*')
          .order('priority', { ascending: false, nullsFirst: false })
          .order('last_message_at', { ascending: false, nullsFirst: false })

        if (agent) {
          // Agent sees their own + waiting conversations + AI mode active conversations (for takeover)
          query = query.or(`agent_id.eq.${agent.agent_id},status.eq.waiting,and(status.eq.active,is_ai_mode.eq.true)`)
        }

        const { data: conversations, error } = await query
        if (error) throw error

        // Attach user profile info - separate guest IDs from real user IDs
        const allUserIds = (conversations ?? []).map((c: any) => c.user_id).filter(Boolean)
        const guestUserIds = allUserIds.filter((id: string) => id.startsWith('guest-'))
        const realUserIds = allUserIds.filter((id: string) => !id.startsWith('guest-'))
        const uniqueRealUserIds = Array.from(new Set(realUserIds))

        let profilesById: Record<string, any> = {}
        
        // Only query profiles for real user IDs (UUIDs)
        if (uniqueRealUserIds.length > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
                        .select('id, username, email, avatar_url, user_number')
                        .in('id', uniqueRealUserIds)

          if (profilesError) {
            console.error('Error fetching profiles:', profilesError)
          } else {
            profilesById = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p]))
          }
        }
        
        // Create synthetic profiles for guest users
        guestUserIds.forEach((guestId: string) => {
          profilesById[guestId] = {
            id: guestId,
            username: '游客',
            email: null,
            avatar_url: null,
            is_guest: true
          }
        })

        // Get unread message counts for each conversation (messages from users not read by agent)
        const conversationIds = (conversations ?? []).map((c: any) => c.id)
        const unreadCountsById: Record<string, number> = {}
        
        if (conversationIds.length > 0) {
          const { data: unreadMessages, error: unreadError } = await supabase
            .from('cs_messages')
            .select('conversation_id')
            .in('conversation_id', conversationIds)
            .eq('sender_type', 'user')
            .is('read_at', null)

          if (!unreadError && unreadMessages) {
            unreadMessages.forEach((msg: any) => {
              unreadCountsById[msg.conversation_id] = (unreadCountsById[msg.conversation_id] || 0) + 1
            })
          }
        }

        const merged = (conversations ?? []).map((c: any) => ({
          ...c,
          profiles: profilesById[c.user_id] ?? { id: c.user_id, username: '未知用户', email: null, avatar_url: null },
          unread_count: unreadCountsById[c.id] || 0,
        }))

        return new Response(
          JSON.stringify({ data: merged }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'get_all_conversations': {
        // Admin only - get all conversations with filters
        const { status, agent_id, user_id, limit = 50, offset = 0 } = data

        let query = supabase
          .from('cs_conversations')
          .select(
            `
              *,
              cs_agents:agent_id (username, display_name)
            `,
            { count: 'exact' }
          )
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        if (status) query = query.eq('status', status)
        if (agent_id) query = query.eq('agent_id', agent_id)
        if (user_id) query = query.eq('user_id', user_id)

        const { data: conversations, count, error } = await query
        if (error) throw error

        // Attach user profile info - separate guest IDs from real user IDs
        const allUserIds = (conversations ?? []).map((c: any) => c.user_id).filter(Boolean)
        const guestUserIds = allUserIds.filter((id: string) => id.startsWith('guest-'))
        const realUserIds = allUserIds.filter((id: string) => !id.startsWith('guest-'))
        const uniqueRealUserIds = Array.from(new Set(realUserIds))

        let profilesById: Record<string, any> = {}
        
        // Only query profiles for real user IDs (UUIDs)
        if (uniqueRealUserIds.length > 0) {
          const { data: profiles, error: profilesError } = await supabase
            .from('profiles')
                        .select('id, username, email, avatar_url, user_number')
                        .in('id', uniqueRealUserIds)

          if (profilesError) {
            console.error('Error fetching profiles:', profilesError)
          } else {
            profilesById = Object.fromEntries((profiles ?? []).map((p: any) => [p.id, p]))
          }
        }
        
        // Create synthetic profiles for guest users
        guestUserIds.forEach((guestId: string) => {
          profilesById[guestId] = {
            id: guestId,
            username: '游客',
            email: null,
            avatar_url: null,
            is_guest: true
          }
        })

        const merged = (conversations ?? []).map((c: any) => ({
          ...c,
          profiles: profilesById[c.user_id] ?? { id: c.user_id, username: '未知用户', email: null, avatar_url: null },
        }))

        return new Response(
          JSON.stringify({ data: merged, count }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'get_messages': {
        const { conversation_id, limit = 100 } = data

        const { data: messages, error } = await supabase
          .from('cs_messages')
          .select('*')
          .eq('conversation_id', conversation_id)
          .order('created_at', { ascending: true })
          .limit(limit)

        if (error) throw error
        return new Response(
          JSON.stringify({ data: messages }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'mark_messages_read': {
        const { conversation_id, reader_type = 'agent' } = data

        if (!conversation_id) {
          return new Response(
            JSON.stringify({ error: '缺少 conversation_id' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        if (!['agent', 'user'].includes(reader_type)) {
          return new Response(
            JSON.stringify({ error: '无效的 reader_type' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { error } = await supabase
          .rpc('mark_messages_as_read', {
            _conversation_id: conversation_id,
            _reader_type: reader_type,
          })

        if (error) throw error

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'send_message': {
        const { conversation_id, content, message_type = 'text', image_url } = data

        const { data: message, error } = await supabase
          .from('cs_messages')
          .insert({
            conversation_id,
            sender_type: 'agent',
            sender_id: agent.agent_id,
            content,
            message_type,
            image_url
          })
          .select()
          .single()

        if (error) throw error

        // Update conversation
        await supabase
          .from('cs_conversations')
          .update({
            last_message_at: new Date().toISOString(),
            last_message_preview: content.substring(0, 100)
          })
          .eq('id', conversation_id)

        return new Response(
          JSON.stringify({ data: message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'accept_conversation': {
        const { conversation_id } = data

        // Check if conversation is in AI mode (takeover scenario)
        const { data: existingConv } = await supabase
          .from('cs_conversations')
          .select('is_ai_mode, status')
          .eq('id', conversation_id)
          .single()

        const isTakeover = existingConv?.is_ai_mode === true && existingConv?.status === 'active'

        const { data: conv, error } = await supabase
          .from('cs_conversations')
          .update({
            agent_id: agent.agent_id,
            status: 'active',
            is_ai_mode: false
          })
          .eq('id', conversation_id)
          .select()
          .single()

        if (error) throw error

        // Add system message - different message for takeover vs normal accept
        const systemMessage = isTakeover 
          ? `人工客服 ${agent.display_name} 已接管对话，将为您提供更专业的服务`
          : `客服 ${agent.display_name} 已接入对话`

        await supabase.from('cs_messages').insert({
          conversation_id,
          sender_type: 'system',
          content: systemMessage
        })

        // Update agent conversation count
        await supabase.rpc('increment_agent_conversations', { agent_id: agent.agent_id })

        return new Response(
          JSON.stringify({ data: conv, is_takeover: isTakeover }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'close_conversation': {
        const { conversation_id } = data

        const { data: conv, error } = await supabase
          .from('cs_conversations')
          .update({
            status: 'closed',
            ended_at: new Date().toISOString()
          })
          .eq('id', conversation_id)
          .select()
          .single()

        if (error) throw error

        // Add system message
        await supabase.from('cs_messages').insert({
          conversation_id,
          sender_type: 'system',
          content: '对话已结束'
        })

        // Decrement agent conversation count if there was an agent
        if (conv.agent_id) {
          const { data: agentData } = await supabase
            .from('cs_agents')
            .select('current_conversations')
            .eq('id', conv.agent_id)
            .single()
          
          if (agentData) {
            await supabase
              .from('cs_agents')
              .update({ current_conversations: Math.max(0, agentData.current_conversations - 1) })
              .eq('id', conv.agent_id)
          }
        }

        return new Response(
          JSON.stringify({ data: conv }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'transfer_conversation': {
        const { conversation_id, to_agent_id, reason } = data

        // Record transfer
        await supabase.from('cs_transfers').insert({
          conversation_id,
          from_agent_id: agent.agent_id,
          to_agent_id,
          reason
        })

        // Update conversation
        const { data: conv, error } = await supabase
          .from('cs_conversations')
          .update({
            agent_id: to_agent_id,
            status: 'transferred'
          })
          .eq('id', conversation_id)
          .select()
          .single()

        if (error) throw error

        // Get new agent name
        const { data: newAgent } = await supabase
          .from('cs_agents')
          .select('display_name')
          .eq('id', to_agent_id)
          .single()

        // Add system message
        await supabase.from('cs_messages').insert({
          conversation_id,
          sender_type: 'system',
          content: `对话已转接给客服 ${newAgent?.display_name || '其他客服'}`
        })

        return new Response(
          JSON.stringify({ data: conv }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // ===== Quick Replies =====
      case 'get_quick_replies': {
        const { data: replies, error } = await supabase
          .from('cs_quick_replies')
          .select('*')
          .eq('is_active', true)
          .order('sort_order', { ascending: true })

        if (error) throw error
        return new Response(
          JSON.stringify({ data: replies }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'manage_quick_replies': {
        if (!isAdmin) {
          return new Response(
            JSON.stringify({ error: '仅管理员可管理快捷回复' }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { operation, reply } = data

        if (operation === 'create') {
          const { data: newReply, error } = await supabase
            .from('cs_quick_replies')
            .insert(reply)
            .select()
            .single()

          if (error) throw error
          return new Response(
            JSON.stringify({ data: newReply }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        } else if (operation === 'update') {
          const { id, ...updateData } = reply
          const { data: updated, error } = await supabase
            .from('cs_quick_replies')
            .update(updateData)
            .eq('id', id)
            .select()
            .single()

          if (error) throw error
          return new Response(
            JSON.stringify({ data: updated }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        } else if (operation === 'delete') {
          const { error } = await supabase
            .from('cs_quick_replies')
            .delete()
            .eq('id', reply.id)

          if (error) throw error
          return new Response(
            JSON.stringify({ success: true }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        return new Response(
          JSON.stringify({ error: '无效的操作类型' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // ===== Agent Status =====
      case 'get_online_agents': {
        const { data: agents, error } = await supabase
          .from('cs_agents')
          .select('id, username, display_name, avatar_url, max_conversations, current_conversations, is_online')
          .eq('is_active', true)
          .eq('is_online', true)
          .order('display_name', { ascending: true })

        if (error) throw error
        return new Response(
          JSON.stringify({ data: agents }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'set_online_status': {
        const { is_online } = data

        const { error } = await supabase
          .from('cs_agents')
          .update({ is_online, updated_at: new Date().toISOString() })
          .eq('id', agent.agent_id)

        if (error) throw error
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // ===== Priority Management =====
      case 'set_priority': {
        const { conversation_id, priority } = data

        // Validate priority value
        if (![0, 1, 2].includes(priority)) {
          return new Response(
            JSON.stringify({ error: '无效的优先级值' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        const { error } = await supabase
          .from('cs_conversations')
          .update({ priority })
          .eq('id', conversation_id)

        if (error) throw error

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        return new Response(
          JSON.stringify({ error: `未知操作: ${action}` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

  } catch (error) {
    console.error('Error in cs-data:', error)
    return new Response(
      JSON.stringify({ error: '操作失败，请稍后重试' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
