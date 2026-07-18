interface AssetsBinding {
  fetch(request: Request): Promise<Response>
}

interface Env {
  ASSETS: AssetsBinding
}

const API_ORIGIN = 'https://katiba-os-api.onrender.com'

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request)

    const upstreamUrl = new URL(`${url.pathname}${url.search}`, API_ORIGIN)
    const headers = new Headers(request.headers)
    headers.delete('host')
    headers.delete('origin')
    headers.delete('referer')

    const response = await fetch(upstreamUrl, {
      method: request.method,
      headers,
      body: request.method === 'GET' || request.method === 'HEAD' ? undefined : request.body,
      redirect: 'manual',
    })
    const responseHeaders = new Headers(response.headers)
    responseHeaders.delete('access-control-allow-origin')
    responseHeaders.delete('access-control-allow-credentials')
    responseHeaders.set('Cache-Control', 'private, no-store')
    responseHeaders.set('X-Katiba-Gateway', 'cloudflare')
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    })
  },
}
