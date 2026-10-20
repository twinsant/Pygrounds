/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    const origin = new URL(process.env.PYGROUNDS_AUTH_API_ORIGIN || 'http://127.0.0.1:8000')
    if (!['http:', 'https:'].includes(origin.protocol)
      || origin.username || origin.password || origin.pathname !== '/'
      || origin.search || origin.hash) {
      throw new Error('PYGROUNDS_AUTH_API_ORIGIN must be an HTTP(S) origin without credentials or a path')
    }
    return [{
      source: '/api/auth/:action(start|verify|me|logout)',
      destination: `${origin.origin}/auth/totp/:action`,
    }]
  },
}

module.exports = nextConfig
