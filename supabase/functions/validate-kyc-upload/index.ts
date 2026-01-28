import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'application/pdf']
const MAX_SIZE = 5 * 1024 * 1024 // 5MB

// Detect MIME type from file content using magic bytes
function detectMimeType(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer.slice(0, 12))
  
  // JPEG: FF D8 FF
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return 'image/jpeg'
  }
  
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
    return 'image/png'
  }
  
  // PDF: 25 50 44 46
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return 'application/pdf'
  }
  
  return 'unknown'
}

// Sanitize filename
function sanitizeFilename(name: string): string {
  return name
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .substring(0, 100)
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Validating KYC upload...')
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    })

    // Verify authentication (explicitly pass JWT to avoid session requirement)
    const authHeader = req.headers.get('Authorization') || ''
    const jwt = authHeader.startsWith('Bearer ')
      ? authHeader.substring('Bearer '.length)
      : authHeader

    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt)
    if (authError || !user) {
      console.error('Authentication error:', authError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse form data
    const formData = await req.formData()
    const file = formData.get('file') as File
    const fileType = formData.get('type') as string
    
    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!['front', 'back', 'selfie'].includes(fileType)) {
      return new Response(
        JSON.stringify({ error: 'Invalid file type parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Validating ${fileType} file: ${file.name}, size: ${file.size}`)

    // Validate file size
    if (file.size > MAX_SIZE) {
      console.log(`File too large: ${file.size} bytes`)
      return new Response(
        JSON.stringify({ error: '文件大小不能超过 5MB' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate MIME type from actual file content
    const buffer = await file.arrayBuffer()
    const actualMimeType = detectMimeType(buffer)
    
    console.log(`Detected MIME type: ${actualMimeType}`)
    
    if (!ALLOWED_MIME_TYPES.includes(actualMimeType)) {
      console.log(`Invalid MIME type: ${actualMimeType}`)
      return new Response(
        JSON.stringify({ error: '仅支持 JPG, PNG, PDF 格式' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Sanitize filename
    const sanitizedFilename = sanitizeFilename(file.name)
    const filePath = `${user.id}/${fileType}_${Date.now()}_${sanitizedFilename}`
    
    console.log(`Uploading to: ${filePath}`)

    // Upload to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('kyc-documents')
      .upload(filePath, buffer, {
        contentType: actualMimeType,
        upsert: false,
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return new Response(
        JSON.stringify({ error: '上传失败，请重试' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Upload successful to path: ${filePath}`)

    // Return the file path (not URL) for database storage
    // Frontend will generate signed URLs when needed
    return new Response(
      JSON.stringify({ 
        success: true,
        path: filePath
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in validate-kyc-upload:', error)
    return new Response(
      JSON.stringify({ 
        error: '处理文件时发生错误',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
