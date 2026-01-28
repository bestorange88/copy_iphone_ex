import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Updated reliable news sources
const NEWS_SOURCES: Record<string, { name: string; url: string; type: string }[]> = {
  en: [
    { name: 'CoinDesk', url: 'https://www.coindesk.com/arc/outboundfeeds/rss/', type: 'rss' },
    { name: 'Cointelegraph', url: 'https://cointelegraph.com/rss', type: 'rss' },
    { name: 'Bitcoin Magazine', url: 'https://bitcoinmagazine.com/.rss/full/', type: 'rss' },
    { name: 'Decrypt', url: 'https://decrypt.co/feed', type: 'rss' },
    { name: 'The Block', url: 'https://www.theblock.co/rss.xml', type: 'rss' }
  ],
  zh: [
    { name: 'CoinTelegraph中文', url: 'https://cn.cointelegraph.com/rss', type: 'rss' },
    { name: 'ChainCatcher', url: 'https://www.chaincatcher.com/rss', type: 'rss' }
  ],
  ja: [
    { name: 'CoinPost', url: 'https://coinpost.jp/?feed=rss2', type: 'rss' },
    { name: 'CoinDesk Japan', url: 'https://www.coindeskjapan.com/feed/', type: 'rss' }
  ],
  ko: [
    { name: 'Block Media', url: 'https://www.blockmedia.co.kr/feed/', type: 'rss' }
  ]
}

// CryptoCompare API for additional news
const CRYPTOCOMPARE_API = 'https://min-api.cryptocompare.com/data/v2/news/'

// RSS parser helper
async function parseRSS(xmlText: string, sourceName: string, language: string): Promise<any[]> {
  const items: any[] = []
  
  // Handle both <item> and <entry> tags (RSS and Atom)
  const itemMatches = xmlText.matchAll(/<item>([\s\S]*?)<\/item>/g)
  const entryMatches = xmlText.matchAll(/<entry>([\s\S]*?)<\/entry>/g)
  
  const allMatches = [...itemMatches, ...entryMatches]
  
  for (const match of allMatches) {
    const itemXml = match[1]
    
    // Handle CDATA and regular title/description
    const titleMatch = itemXml.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) || 
                       itemXml.match(/<title[^>]*>([\s\S]*?)<\/title>/)
    const title = titleMatch?.[1]?.replace(/<[^>]*>/g, '').trim() || ''
    
    // Handle different link formats
    const linkMatch = itemXml.match(/<link[^>]*href="([^"]*)"/) ||
                      itemXml.match(/<link>([\s\S]*?)<\/link>/) ||
                      itemXml.match(/<guid[^>]*>([\s\S]*?)<\/guid>/)
    const link = linkMatch?.[1]?.replace(/<!\[CDATA\[|\]\]>/g, '').trim() || ''
    
    // Handle description/summary/content
    const descMatch = itemXml.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) || 
                      itemXml.match(/<description>([\s\S]*?)<\/description>/) ||
                      itemXml.match(/<summary[^>]*>([\s\S]*?)<\/summary>/) ||
                      itemXml.match(/<content[^>]*>([\s\S]*?)<\/content>/)
    const description = descMatch?.[1]?.replace(/<[^>]*>/g, '').replace(/<!\[CDATA\[|\]\]>/g, '').trim() || ''
    
    // Handle different date formats
    const pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/) ||
                         itemXml.match(/<published>([\s\S]*?)<\/published>/) ||
                         itemXml.match(/<updated>([\s\S]*?)<\/updated>/) ||
                         itemXml.match(/<dc:date>([\s\S]*?)<\/dc:date>/)
    const pubDate = pubDateMatch?.[1]?.trim() || new Date().toISOString()
    
    // Extract image from various sources
    const imageMatch = itemXml.match(/<media:thumbnail[^>]*url="([^"]*)"/) ||
                       itemXml.match(/<media:content[^>]*url="([^"]*)"/) ||
                       itemXml.match(/<enclosure[^>]*url="([^"]*)"[^>]*type="image/) ||
                       itemXml.match(/<img[^>]*src="([^"]*)"/) ||
                       itemXml.match(/<image>([\s\S]*?)<\/image>/)
    const imageUrl = imageMatch?.[1] || null
    
    if (title && link) {
      items.push({
        title: title.substring(0, 500),
        summary: description.substring(0, 500),
        content: description,
        source: sourceName,
        source_url: link,
        image_url: imageUrl,
        category: determineCategory(title + ' ' + description),
        published_at: parseDate(pubDate),
        is_hot: false,
        language: language
      })
    }
  }
  
  return items
}

// Parse various date formats
function parseDate(dateStr: string): string {
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) {
      return new Date().toISOString()
    }
    return date.toISOString()
  } catch {
    return new Date().toISOString()
  }
}

// Fetch news from CryptoCompare API with improved error handling
async function fetchCryptoCompareNews(language: string): Promise<any[]> {
  try {
    const langMap: Record<string, string> = {
      'en': 'EN',
      'zh': 'EN', // CryptoCompare doesn't have good Chinese support, use EN
      'zh-CN': 'EN',
      'zh-TW': 'EN',
      'ja': 'JA',
      'ko': 'KO',
      'es': 'ES',
      'de': 'DE',
      'fr': 'FR',
      'ar': 'AR'
    }
    
    const apiLang = langMap[language] || 'EN'
    const url = `${CRYPTOCOMPARE_API}?lang=${apiLang}`
    
    console.log(`Fetching CryptoCompare news for language: ${apiLang}`)
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)'
      },
      signal: AbortSignal.timeout(15000)
    })
    
    if (!response.ok) {
      console.error(`CryptoCompare API failed: ${response.status}`)
      return []
    }
    
    const data = await response.json()
    
    // Handle different response formats
    const newsData = data.Data || data.data || []
    
    if (!Array.isArray(newsData)) {
      console.log('CryptoCompare returned non-array data:', typeof newsData)
      return []
    }
    
    return newsData.map((item: any) => ({
      title: item.title?.substring(0, 500) || '',
      summary: item.body?.substring(0, 500) || '',
      content: item.body || '',
      source: item.source_info?.name || item.source || 'CryptoCompare',
      source_url: item.url || item.guid || '',
      image_url: item.imageurl || null,
      category: determineCategory(item.title + ' ' + (item.body || '')),
      published_at: item.published_on ? new Date(item.published_on * 1000).toISOString() : new Date().toISOString(),
      is_hot: (item.upvotes || 0) > 10,
      language: language
    })).filter((item: any) => item.title && item.source_url)
  } catch (error) {
    console.error('CryptoCompare fetch error:', error)
    return []
  }
}

// Alternative: Generate placeholder news when no sources are available
function generatePlaceholderNews(language: string): any[] {
  const now = new Date()
  const placeholders = language === 'zh' ? [
    {
      title: 'BTC 市场动态更新',
      summary: '比特币市场持续活跃，交易量保持稳定增长。',
      category: 'market'
    },
    {
      title: 'ETH 生态系统发展',
      summary: '以太坊生态系统继续扩展，DeFi 应用创新不断。',
      category: 'tech'
    },
    {
      title: '加密货币监管动向',
      summary: '全球加密货币监管政策持续演进。',
      category: 'policy'
    }
  ] : [
    {
      title: 'Bitcoin Market Update',
      summary: 'The Bitcoin market continues to show strong activity with steady trading volumes.',
      category: 'market'
    },
    {
      title: 'Ethereum Ecosystem Growth',
      summary: 'The Ethereum ecosystem continues to expand with innovative DeFi applications.',
      category: 'tech'
    },
    {
      title: 'Crypto Regulatory Developments',
      summary: 'Global cryptocurrency regulation continues to evolve.',
      category: 'policy'
    }
  ]

  return placeholders.map((item, index) => ({
    ...item,
    content: item.summary,
    source: 'ARX News',
    source_url: `https://arx.news/placeholder-${language}-${index}-${now.getTime()}`,
    image_url: null,
    published_at: new Date(now.getTime() - index * 3600000).toISOString(),
    is_hot: index === 0,
    language: language
  }))
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Parse request body for language parameter
    let requestedLang = 'all'
    try {
      const body = await req.json()
      requestedLang = body.language || 'all'
    } catch {
      // No body or invalid JSON, default to all languages
    }
    
    console.log(`Starting crypto news fetch for language: ${requestedLang}`)
    
    const allNewsItems: any[] = []
    
    // Determine which languages to fetch
    const languagesToFetch = requestedLang === 'all' 
      ? ['en', 'zh'] 
      : [requestedLang.startsWith('zh') ? 'zh' : requestedLang]
    
    // Fetch from RSS sources for each language
    for (const lang of languagesToFetch) {
      const sources = NEWS_SOURCES[lang] || NEWS_SOURCES.en
      
      for (const source of sources) {
        try {
          console.log(`Fetching from ${source.name} (${lang})...`)
          const controller = new AbortController()
          const timeoutId = setTimeout(() => controller.abort(), 10000)
          
          const response = await fetch(source.url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml, */*'
            },
            signal: controller.signal
          })
          
          clearTimeout(timeoutId)
          
          if (response.ok) {
            const xmlText = await response.text()
            const items = await parseRSS(xmlText, source.name, lang)
            console.log(`${source.name}: ${items.length} items`)
            
            // Take the first 15 items from each source
            items.slice(0, 15).forEach(item => {
              allNewsItems.push(item)
            })
          } else {
            console.error(`${source.name} fetch failed with status: ${response.status}`)
          }
        } catch (err: any) {
          console.error(`${source.name} fetch error:`, err.message || err)
        }
      }
      
      // Also fetch from CryptoCompare API
      try {
        const cryptoCompareItems = await fetchCryptoCompareNews(lang)
        console.log(`CryptoCompare (${lang}): ${cryptoCompareItems.length} items`)
        cryptoCompareItems.slice(0, 20).forEach(item => {
          allNewsItems.push(item)
        })
      } catch (err: any) {
        console.error(`CryptoCompare fetch error for ${lang}:`, err.message || err)
      }
    }

    // If no news was fetched, add placeholder content
    if (allNewsItems.length === 0) {
      console.log('No news from external sources, adding placeholder content')
      for (const lang of languagesToFetch) {
        const placeholders = generatePlaceholderNews(lang)
        allNewsItems.push(...placeholders)
      }
    }
    
    console.log(`Total news items collected: ${allNewsItems.length}`)

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Remove duplicates based on source_url
    const uniqueNews = Array.from(
      new Map(allNewsItems.map(item => [item.source_url, item])).values()
    )
    
    console.log(`Unique news items: ${uniqueNews.length}`)

    // Insert news items into database (upsert to avoid duplicates)
    let insertedCount = 0
    const batchSize = 20
    
    for (let i = 0; i < uniqueNews.length; i += batchSize) {
      const batch = uniqueNews.slice(i, i + batchSize)
      
      const { data: insertedData, error: insertError } = await supabase
        .from('crypto_news')
        .upsert(batch, { 
          onConflict: 'source_url',
          ignoreDuplicates: false 
        })
        .select()

      if (insertError) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, insertError.message)
      } else {
        insertedCount += insertedData?.length || 0
      }
    }

    console.log(`Successfully upserted ${insertedCount} news items`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: insertedCount,
        total_fetched: allNewsItems.length,
        message: `Successfully fetched and stored ${insertedCount} crypto news items`,
        languages: languagesToFetch
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error: any) {
    console.error('Error in fetch-crypto-news:', error)
    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message,
        details: 'Failed to fetch or store crypto news'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    )
  }
})

// Helper function to determine news category
function determineCategory(text: string): string {
  const textLower = text.toLowerCase()
  
  // DeFi keywords
  if (textLower.includes('defi') || textLower.includes('nft') || 
      textLower.includes('dex') || textLower.includes('uniswap') ||
      textLower.includes('lending') || textLower.includes('yield') ||
      textLower.includes('swap') || textLower.includes('liquidity') ||
      textLower.includes('airdrop') || textLower.includes('去中心化') ||
      textLower.includes('空投')) {
    return 'defi'
  }
  
  // Policy/regulation
  if (textLower.includes('regulation') || textLower.includes('sec') || 
      textLower.includes('government') || textLower.includes('policy') ||
      textLower.includes('law') || textLower.includes('ban') ||
      textLower.includes('legal') || textLower.includes('監管') ||
      textLower.includes('监管') || textLower.includes('政策') ||
      textLower.includes('規制') || textLower.includes('規定')) {
    return 'policy'
  }
  
  // Technology
  if (textLower.includes('technology') || textLower.includes('upgrade') || 
      textLower.includes('protocol') || textLower.includes('blockchain') ||
      textLower.includes('launch') || textLower.includes('release') ||
      textLower.includes('development') || textLower.includes('layer') ||
      textLower.includes('技術') || textLower.includes('技术') ||
      textLower.includes('開發') || textLower.includes('开发') ||
      textLower.includes('升級') || textLower.includes('升级')) {
    return 'tech'
  }
  
  // Market news
  if (textLower.includes('bitcoin') || textLower.includes('btc') || 
      textLower.includes('ethereum') || textLower.includes('eth') ||
      textLower.includes('price') || textLower.includes('market') ||
      textLower.includes('trading') || textLower.includes('rally') ||
      textLower.includes('crash') || textLower.includes('bull') ||
      textLower.includes('bear') || textLower.includes('比特幣') ||
      textLower.includes('比特币') || textLower.includes('以太坊') ||
      textLower.includes('價格') || textLower.includes('价格') ||
      textLower.includes('行情') || textLower.includes('暴漲') ||
      textLower.includes('暴涨')) {
    return 'market'
  }
  
  return 'general'
}
