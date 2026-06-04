// ============================================================================
// ZOHO INVOICE OAUTH CALLBACK
// Handles OAuth 2.0 authorization code exchange
// Deploy to: supabase/functions/zoho-oauth-callback/index.ts
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ZOHO_CLIENT_ID = Deno.env.get('ZOHO_CLIENT_ID')!
const ZOHO_CLIENT_SECRET = Deno.env.get('ZOHO_CLIENT_SECRET')!
const ZOHO_REDIRECT_URI = Deno.env.get('ZOHO_REDIRECT_URI')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

interface ZohoTokenResponse {
  access_token: string
  refresh_token: string
  expires_in: number
  api_domain: string
  token_type: string
}

serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const url = new URL(req.url)
    const code = url.searchParams.get('code')
    const location = url.searchParams.get('location')
    const accountsServer = url.searchParams.get('accounts-server')

    if (!code) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization code' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Exchange authorization code for tokens
    const tokenEndpoint = `${accountsServer}/oauth/v2/token`
    const tokenResponse = await fetch(tokenEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: ZOHO_CLIENT_ID,
        client_secret: ZOHO_CLIENT_SECRET,
        redirect_uri: ZOHO_REDIRECT_URI,
        code: code,
      }),
    })

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.text()
      console.error('Zoho token exchange failed:', errorData)
      return new Response(
        JSON.stringify({ error: 'Token exchange failed', detail: errorData }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const tokens: ZohoTokenResponse = await tokenResponse.json()

    // Get organization ID from Zoho Invoice API
    const orgResponse = await fetch(`${tokens.api_domain}/invoice/v3/organizations`, {
      headers: { Authorization: `Zoho-oauthtoken ${tokens.access_token}` },
    })

    if (!orgResponse.ok) {
      const errorText = await orgResponse.text()
      console.error('Org API failed:', errorText)
      throw new Error(`Failed to fetch Zoho organizations: ${orgResponse.status} - ${errorText}`)
    }

    const orgData = await orgResponse.json()
    const organizationId = orgData.organizations?.[0]?.organization_id

    if (!organizationId) {
      throw new Error('No organization found in Zoho Invoice account')
    }

    // Store tokens in Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000)

    const { error: dbError } = await supabase.from('zoho_auth_tokens').insert({
      organization_id: organizationId,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt.toISOString(),
      api_domain: tokens.api_domain,
      is_active: true,
    })

    if (dbError) {
      console.error('Database insert failed:', dbError)
      throw new Error(`Database error: ${dbError.message}`)
    }

    // Return success page
    return new Response(
      `
      <!DOCTYPE html>
      <html>
      <head><title>Zoho Invoice Connected</title></head>
      <body style="font-family: sans-serif; max-width: 600px; margin: 100px auto; text-align: center;">
        <h1>✅ Zoho Invoice Connected</h1>
        <p>Authorization successful. You can close this window.</p>
        <p><strong>Organization ID:</strong> ${organizationId}</p>
        <p><strong>API Domain:</strong> ${tokens.api_domain}</p>
        <p><a href="https://hub.kocabean.co.za">Return to Dashboard</a></p>
      </body>
      </html>
      `,
      { status: 200, headers: { 'Content-Type': 'text/html' } }
    )

  } catch (error) {
    console.error('OAuth callback error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
