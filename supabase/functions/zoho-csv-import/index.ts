import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type SupabaseClient = ReturnType<typeof createClient>;
type AdminRow = { role?: string; is_active?: boolean };

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function requireAdminCaller(
  req: Request,
  admin: SupabaseClient,
): Promise<{ adminUserId: string } | Response> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.toLowerCase().startsWith('bearer ')) {
    return jsonResponse({ error: 'Unauthorized: missing bearer token' }, 401);
  }

  const token = authHeader.slice(7).trim();
  const anonClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data: userRes, error: userErr } = await anonClient.auth.getUser(token);
  if (userErr || !userRes?.user) {
    return jsonResponse({ error: 'Unauthorized: invalid session' }, 401);
  }

  const { data: adminRow, error: adminErr } = await admin
    .from('admin_users')
    .select('role, is_active')
    .eq('user_id', userRes.user.id)
    .maybeSingle();

  if (adminErr) {
    console.error('[zoho-csv-import] admin_users lookup failed:', adminErr.message);
    return jsonResponse({ error: 'Forbidden: admin check failed' }, 403);
  }

  const activeAdmin = adminRow as AdminRow | null;
  if (!activeAdmin || activeAdmin.is_active !== true) {
    return jsonResponse({ error: 'Forbidden: active admin role required' }, 403);
  }

  if (!['admin', 'super_admin'].includes(String(activeAdmin.role))) {
    return jsonResponse({ error: 'Forbidden: admin role required' }, 403);
  }

  return { adminUserId: userRes.user.id };
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const adminCheck = await requireAdminCaller(req, supabase);
    if (adminCheck instanceof Response) return adminCheck;

    const { type, data } = await req.json();

    if (!type || !data) {
      return jsonResponse({ error: 'Missing type or data' }, 400);
    }

    if (!['customers', 'invoices'].includes(type) || !Array.isArray(data)) {
      return jsonResponse({ error: 'Invalid import payload' }, 400);
    }

    const tableName = type === 'customers' ? 'zoho_customers_raw' : 'zoho_invoices_raw';
    const conflictColumn = type === 'customers' ? 'zoho_customer_id' : 'zoho_invoice_id';

    const { data: tokenData, error: tokenError } = await supabase
      .from('zoho_auth_tokens')
      .select('organization_id')
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (tokenError) {
      console.error('[zoho-csv-import] token lookup failed:', tokenError.message);
      return jsonResponse({ error: 'Failed to load active Zoho organization' }, 500);
    }

    if (!tokenData?.organization_id) {
      return jsonResponse({ error: 'No active Zoho organization found' }, 400);
    }

    const organizationId = tokenData.organization_id;

    const records = data.map((row: any, index: number) => {
      const normalizedRow: Record<string, any> = {};
      
      // Aggressively strip ALL non-alphanumeric characters to defeat hidden Zoho BOMs
      for (const key in row) {
        const cleanKey = key.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
        normalizedRow[cleanKey] = row[key];
      }

      // Handle Invoices vs Customers based on the exact headers we now know exist
      let extractedId;
      
      if (type === 'customers') {
        // For customers, try to find an ID, fallback to company name
        extractedId = normalizedRow['zohocustomerid'] || normalizedRow['customerid'] || normalizedRow['primarycontactid'] || normalizedRow['companyname'];
      } else {
        // For invoices, it MUST find the invoiceid
        extractedId = normalizedRow['zohoinvoiceid'] || normalizedRow['invoiceid'];
      }

      if (!extractedId) {
        // If it fails, print the EXACT raw keys so we can see the invisible characters
        const actualKeys = Object.keys(row).join("', '");
        console.error(`Row ${index + 1} failed. Normalized keys:`, Object.keys(normalizedRow));
        throw new Error(`Row ${index + 1} failed. Could not find required ID. Available CSV headers are: '${actualKeys}'`);
      }

      // Build the record - for invoices, also capture company name in zoho_customer_id
      const record: any = {
        [conflictColumn]: String(extractedId),
        zoho_organization_id: organizationId,
        raw_data: row,
        synced_at: new Date().toISOString()
      };

      // For invoices, prefer a real customer ID. Company Name fallback is legacy CSV compatibility only.
      if (type === 'invoices') {
        const customerId = normalizedRow['zohocustomerid'] || normalizedRow['customerid'] || normalizedRow['contactid'] || normalizedRow['companyname'];
        if (!customerId) {
          const actualKeys = Object.keys(row).join("', '");
          throw new Error(`Row ${index + 1} failed. Could not find required customer ID. Available CSV headers are: '${actualKeys}'`);
        }
        record.zoho_customer_id = String(customerId);
      }

      return record;
    });

    console.log(`Processing ${records.length} ${type} records...`);

    // Perform the upsert (now securely restricted by our new RLS policies)
    const { error } = await supabase
      .from(tableName)
      .upsert(records, { onConflict: conflictColumn });

    if (error) {
      console.error('Upsert error:', error);
      return jsonResponse({ error: error.message }, 400);
    }

    // Log the import
    await supabase.from('zoho_sync_log').insert({
      sync_type: type,
      status: 'success',
      records_fetched: records.length,
      records_updated: records.length,
      completed_at: new Date().toISOString(),
    });

    console.log(`✅ Successfully imported ${records.length} ${type}`);

    return jsonResponse({ 
      success: true, 
      count: records.length,
      message: `Successfully imported ${records.length} ${type}`
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown import error';
    const type = error instanceof Error ? error.name : 'Error';
    console.error('Import error:', error);
    return jsonResponse({ 
      error: message,
      type
    }, 500);
  }
});
