import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Get user from auth header - allow guest access
    const authHeader = req.headers.get('authorization')
    let user: { id: string; email?: string | null; isGuest?: boolean } | null = null
    
    if (authHeader && authHeader !== 'Bearer null' && authHeader !== 'Bearer undefined') {
      const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } }
      })

      const { data: { user: authUser }, error: authError } = await userClient.auth.getUser()
      if (!authError && authUser) {
        user = authUser
      }
    }

    const { action, guest_id, ...data } = await req.json()
    
    // If no authenticated user, check for guest_id
    if (!user) {
      if (guest_id && typeof guest_id === 'string' && guest_id.startsWith('guest-')) {
        user = { id: guest_id, email: null, isGuest: true }
      } else {
        return new Response(
          JSON.stringify({ error: '请先登录或提供游客ID' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
    }

    switch (action) {
      case 'start_conversation': {
        // Check for online agents first
        const { data: onlineAgents } = await supabase
          .from('cs_agents')
          .select('id, current_conversations, max_conversations')
          .eq('is_online', true)
          .eq('is_active', true)

        const availableAgents = (onlineAgents || []).filter(a => a.current_conversations < a.max_conversations)
        const hasOnlineAgents = availableAgents.length > 0

        // Check if user has active conversation
        const { data: existing } = await supabase
          .from('cs_conversations')
          .select('*')
          .eq('user_id', user.id)
          .in('status', ['waiting', 'active'])
          .single()

        if (existing) {
          // If conversation is in AI mode but agents are now online, switch to waiting mode
          if (existing.is_ai_mode && hasOnlineAgents && existing.status === 'active') {
            const { data: updated } = await supabase
              .from('cs_conversations')
              .update({
                is_ai_mode: false,
                status: 'waiting'
              })
              .eq('id', existing.id)
              .select()
              .single()

            // Add system message about agent availability
            await supabase.from('cs_messages').insert({
              conversation_id: existing.id,
              sender_type: 'system',
              content: '客服已上线，正在为您分配客服，请稍候...'
            })

            return new Response(
              JSON.stringify({ data: updated, switched_to_human: true }),
              { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
          }

          return new Response(
            JSON.stringify({ data: existing }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Create new conversation
        const { data: conversation, error } = await supabase
          .from('cs_conversations')
          .insert({
            user_id: user.id,
            status: hasOnlineAgents ? 'waiting' : 'active',
            is_ai_mode: !hasOnlineAgents
          })
          .select()
          .single()

        if (error) throw error

        // Add welcome message
        const welcomeMessage = hasOnlineAgents 
          ? '您好！正在为您分配客服，请稍候...'
          : '您好！当前暂无客服在线，我是AI智能助手，请问有什么可以帮助您的？'

        await supabase.from('cs_messages').insert({
          conversation_id: conversation.id,
          sender_type: hasOnlineAgents ? 'system' : 'ai',
          content: welcomeMessage
        })

        return new Response(
          JSON.stringify({ data: conversation, is_ai_mode: !hasOnlineAgents }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'send_message': {
        const { conversation_id, content, message_type = 'text', image_url } = data

        // Verify conversation belongs to user
        const { data: conv } = await supabase
          .from('cs_conversations')
          .select('*')
          .eq('id', conversation_id)
          .eq('user_id', user.id)
          .single()

        if (!conv) {
          return new Response(
            JSON.stringify({ error: '对话不存在' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Save user message
        // For guest users, sender_id should be null since it's a UUID column
        const isGuest = (user as any).isGuest === true
        const { data: message, error } = await supabase
          .from('cs_messages')
          .insert({
            conversation_id,
            sender_type: 'user',
            sender_id: isGuest ? null : user.id,
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

        // If in AI mode, generate AI response
        if (conv.is_ai_mode && message_type === 'text' && LOVABLE_API_KEY) {
          try {
            // Get conversation history
            const { data: history } = await supabase
              .from('cs_messages')
              .select('sender_type, content')
              .eq('conversation_id', conversation_id)
              .order('created_at', { ascending: true })
              .limit(20)

            const messages = [
              {
                role: 'system',
                content: `你是Binarycent Trading平台的AI客服助手。请友好、专业地回答用户问题。
主要功能介绍：
- 现货交易：支持多种加密货币买卖
- 合约交易：支持永续合约和秒合约
- 理财产品：提供多种收益产品
- 充值提现：支持多种网络充值
如果用户问题超出你的能力范围，请建议用户等待人工客服上线。`
              },
              ...(history || []).map(m => ({
                role: m.sender_type === 'user' ? 'user' : 'assistant',
                content: m.content
              }))
            ]

            const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${LOVABLE_API_KEY}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                model: 'google/gemini-2.5-flash',
                messages,
                max_tokens: 500
              })
            })

            if (aiResponse.ok) {
              const aiData = await aiResponse.json()
              const aiContent = aiData.choices?.[0]?.message?.content

              if (aiContent) {
                await supabase.from('cs_messages').insert({
                  conversation_id,
                  sender_type: 'ai',
                  content: aiContent
                })

                await supabase
                  .from('cs_conversations')
                  .update({
                    last_message_at: new Date().toISOString(),
                    last_message_preview: aiContent.substring(0, 100)
                  })
                  .eq('id', conversation_id)
              }
            }
          } catch (aiError) {
            console.error('AI response error:', aiError)
          }
        }

        return new Response(
          JSON.stringify({ data: message }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'get_messages': {
        const { conversation_id, limit = 100 } = data

        // Verify conversation belongs to user
        const { data: conv } = await supabase
          .from('cs_conversations')
          .select('id')
          .eq('id', conversation_id)
          .eq('user_id', user.id)
          .single()

        if (!conv) {
          return new Response(
            JSON.stringify({ error: '对话不存在' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

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

      case 'get_conversation': {
        const { data: conversation } = await supabase
          .from('cs_conversations')
          .select('*')
          .eq('user_id', user.id)
          .in('status', ['waiting', 'active'])
          .single()

        return new Response(
          JSON.stringify({ data: conversation }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'end_conversation': {
        const { conversation_id } = data

        const { error } = await supabase
          .from('cs_conversations')
          .update({
            status: 'closed',
            ended_at: new Date().toISOString()
          })
          .eq('id', conversation_id)
          .eq('user_id', user.id)

        if (error) throw error

        await supabase.from('cs_messages').insert({
          conversation_id,
          sender_type: 'system',
          content: '您已结束对话，感谢您的咨询！'
        })

        return new Response(
          JSON.stringify({ success: true, needs_rating: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'submit_rating': {
        const { conversation_id, rating, comment } = data

        // Verify conversation belongs to user
        const { data: conv } = await supabase
          .from('cs_conversations')
          .select('id, status')
          .eq('id', conversation_id)
          .eq('user_id', user.id)
          .single()

        if (!conv) {
          return new Response(
            JSON.stringify({ error: '对话不存在' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Update conversation with rating
        const { error } = await supabase
          .from('cs_conversations')
          .update({
            rating,
            rating_comment: comment || null,
            rated_at: new Date().toISOString()
          })
          .eq('id', conversation_id)
          .eq('user_id', user.id)

        if (error) throw error

        // Add system message about rating
        const ratingLabels = ['', '非常不满意', '不满意', '一般', '满意', '非常满意']
        await supabase.from('cs_messages').insert({
          conversation_id,
          sender_type: 'system',
          content: `用户评价：${ratingLabels[rating]}（${rating}星）${comment ? `\n评价内容：${comment}` : ''}`
        })

        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      case 'mark_messages_read': {
        const { conversation_id } = data

        // Verify conversation belongs to user
        const { data: conv } = await supabase
          .from('cs_conversations')
          .select('id')
          .eq('id', conversation_id)
          .eq('user_id', user.id)
          .single()

        if (!conv) {
          return new Response(
            JSON.stringify({ error: '对话不存在' }),
            { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Mark agent/ai/system messages as read by user
        const { error } = await supabase
          .rpc('mark_messages_as_read', {
            _conversation_id: conversation_id,
            _reader_type: 'user'
          })

        if (error) throw error
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      default:
        return new Response(
          JSON.stringify({ error: '未知操作' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

  } catch (error: unknown) {
    console.error('Error in cs-user-chat:', error)
    const errorMessage = error instanceof Error ? error.message : '操作失败'
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
