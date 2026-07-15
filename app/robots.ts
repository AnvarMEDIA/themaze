import { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.maze.uz'

// AI answer-engine / LLM crawlers we explicitly welcome to index and cite
// the public site. They're already covered by `*`, but naming them makes
// the intent unambiguous and future-proof (and some honour a named rule
// over the wildcard). Site map for humans/bots is sitemap.xml; the
// LLM-oriented index is /llms.txt.
const AI_BOTS = [
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',      // OpenAI
  'PerplexityBot', 'Perplexity-User',             // Perplexity
  'ClaudeBot', 'anthropic-ai', 'Claude-Web',      // Anthropic
  'Google-Extended',                              // Google Gemini / AI Overviews
  'Applebot-Extended',                            // Apple Intelligence
  'Amazonbot', 'Meta-ExternalAgent', 'FacebookBot',
  'CCBot', 'cohere-ai', 'YouBot', 'DuckAssistBot', 'Bytespider',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*',     allow: '/', disallow: ['/admin/', '/api/'] },
      { userAgent: AI_BOTS, allow: '/', disallow: ['/admin/', '/api/'] },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
