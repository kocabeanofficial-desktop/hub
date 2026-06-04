// ============================================================================
// ZOHO INVOICE SYNC
// Pulls customers and invoices from Zoho Invoice API
// Stores raw JSON in staging tables
// Deploy to: supabase/functions/zoho-sync/index.ts
// ============================================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ZOHO_CLIENT_ID = Deno.env.get('ZOHO_CLIENT_ID')!
const ZOHO_CLIENT_SECRET = Deno.env.get('ZOHO_CLIENT_SECRET')!

// Token refresh utility (inline for now - in production, import from separate file)
async function refreshZohoToken(supabase: any, orgId?: string): Promise<string> {
  let query = supabase
    .from('zoho_auth_tokens')
    .select('*')
    .eq('is_active', true)
    .single()

  if (orgId) {
    query = query.eq('organization_id', orgId)
  }

  const { data: tokenRecord, error: fetchError } = await query

  if (fetchError || !tokenRecord) {
    throw new Error('No active Zoho token found')
  }

  const expiresAt = new Date(tokenRecord.expires_at)
  const now = new Date()
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000)

  if (expiresAt > fiveMinutesFromNow) {
    return tokenRecord.access_token
  }

  const location = tokenRecord.api_domain.split('.').pop() || 'com'
  const accountsServer = `https://accounts.zoho.${location}`

  const refreshResponse = await fetch(`${accountsServer}/oauth/v2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: ZOHO_CLIENT_ID,
      client_secret: ZOHO_CLIENT_SECRET,
      refresh_token: tokenRecord.refresh_token,
    }),
  })

  if (!refreshResponse.ok) {
    const errorData = await refreshResponse.text()
    throw new Error(`Token refresh failed: ${errorData}`)
  }

  const newTokens = await refreshResponse.json()
  const newExpiresAt = new Date(Date.now() + newTokens.expires_in * 1000)

  await supabase
    .from('zoho_auth_tokens')
    .update({
      access_token: newTokens.access_token,
      expires_at: newExpiresAt.toISOString(),
      updated_at: new Date().toISOString(),
      last_refresh_at: new Date().toISOString(),
    })
    .eq('id', tokenRecord.id)

  await supabase.from('zoho_sync_log').insert({
    sync_type: 'auth_refresh',
    status: 'success',
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  })

  return newTokens.access_token
}

interface SyncOptions {
  syncCustomers?: boolean
  syncInvoices?: boolean
  fullSync?: boolean
}

serve(async (req) => {
  // Authentication check
  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  try {
    // Parse request body for options
    const options: SyncOptions = req.method === 'POST' 
      ? await req.json()
      : { syncCustomers: true, syncInvoices: true, fullSync: false }

    const results = {
      customers: { fetched: 0, created: 0, updated: 0 },
      invoices: { fetched: 0, created: 0, updated: 0 },
      errors: [] as string[],
    }

    // Get fresh access token
    const accessToken = await refreshZohoToken(supabase)

    // Get organization info
    const { data: tokenData } = await supabase
      .from('zoho_auth_tokens')
      .select('organization_id, api_domain')
      .eq('is_active', true)
      .single()

    if (!tokenData) {
      throw new Error('No active Zoho organization found')
    }

    const { organization_id: orgId, api_domain: apiDomain } = tokenData

    // ========================================================================
    // SYNC CUSTOMERS
    // ========================================================================
    if (options.syncCustomers !== false) {
      const customerSyncLog = await supabase.from('zoho_sync_log').insert({
        sync_type: 'customers',
        status: 'started',
      }).select().single()

      const startTime = Date.now()

      try {
        const customersUrl = `${apiDomain}/invoice/v3/contacts?organization_id=${orgId}`
        const customersResponse = await fetch(customersUrl, {
          headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
        })

        if (!customersResponse.ok) {
          throw new Error(`Customers API failed: ${customersResponse.statusText}`)
        }

        const customersData = await customersResponse.json()
        const customers = customersData.contacts || []

        results.customers.fetched = customers.length

        // Upsert customers
        for (const customer of customers) {
          const { error } = await supabase
            .from('zoho_customers_raw')
            .upsert({
              zoho_customer_id: customer.contact_id,
              zoho_organization_id: orgId,
              raw_data: customer,
              synced_at: new Date().toISOString(),
            }, {
              onConflict: 'zoho_customer_id,zoho_organization_id',
            })

          if (error) {
            results.errors.push(`Customer ${customer.contact_id}: ${error.message}`)
          } else {
            results.customers.updated++
          }
        }

        // Update sync log
        await supabase.from('zoho_sync_log').update({
          status: 'success',
          records_fetched: results.customers.fetched,
          records_updated: results.customers.updated,
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - startTime,
        }).eq('id', customerSyncLog.data.id)

      } catch (error) {
        await supabase.from('zoho_sync_log').update({
          status: 'failed',
          error_message: error.message,
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - startTime,
        }).eq('id', customerSyncLog.data.id)

        results.errors.push(`Customers sync failed: ${error.message}`)
      }
    }

    // ========================================================================
    // SYNC INVOICES
    // ========================================================================
    if (options.syncInvoices !== false) {
      const invoiceSyncLog = await supabase.from('zoho_sync_log').insert({
        sync_type: 'invoices',
        status: 'started',
      }).select().single()

      const startTime = Date.now()

      try {
        // Get all invoices (paginated if needed)
        let page = 1
        let hasMore = true
        const allInvoices = []

        while (hasMore) {
          const invoicesUrl = `${apiDomain}/invoice/v3/invoices?organization_id=${orgId}&page=${page}&per_page=200`
          const invoicesResponse = await fetch(invoicesUrl, {
            headers: { Authorization: `Zoho-oauthtoken ${accessToken}` },
          })

          if (!invoicesResponse.ok) {
            throw new Error(`Invoices API failed: ${invoicesResponse.statusText}`)
          }

          const invoicesData = await invoicesResponse.json()
          const invoices = invoicesData.invoices || []

          allInvoices.push(...invoices)

          hasMore = invoicesData.page_context?.has_more_page || false
          page++
        }

        results.invoices.fetched = allInvoices.length

        // Upsert invoices
        for (const invoice of allInvoices) {
          const { error } = await supabase
            .from('zoho_invoices_raw')
            .upsert({
              zoho_invoice_id: invoice.invoice_id,
              zoho_customer_id: invoice.customer_id,
              zoho_organization_id: orgId,
              raw_data: invoice,
              synced_at: new Date().toISOString(),
            }, {
              onConflict: 'zoho_invoice_id,zoho_organization_id',
            })

          if (error) {
            results.errors.push(`Invoice ${invoice.invoice_id}: ${error.message}`)
          } else {
            results.invoices.updated++
          }
        }

        // Update sync log
        await supabase.from('zoho_sync_log').update({
          status: 'success',
          records_fetched: results.invoices.fetched,
          records_updated: results.invoices.updated,
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - startTime,
        }).eq('id', invoiceSyncLog.data.id)

      } catch (error) {
        await supabase.from('zoho_sync_log').update({
          status: 'failed',
          error_message: error.message,
          completed_at: new Date().toISOString(),
          duration_ms: Date.now() - startTime,
        }).eq('id', invoiceSyncLog.data.id)

        results.errors.push(`Invoices sync failed: ${error.message}`)
      }
    }

    return new Response(
      JSON.stringify({
        success: results.errors.length === 0,
        results,
        timestamp: new Date().toISOString(),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Sync error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
