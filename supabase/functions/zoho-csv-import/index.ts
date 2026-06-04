import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Create client using ANON key, but attach the user's JWT from the request
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { type, data } = await req.json();

    if (!type || !data) {
      return new Response(
        JSON.stringify({ error: 'Missing type or data' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tableName = type === 'customers' ? 'zoho_customers_raw' : 'zoho_invoices_raw';
    const conflictColumn = type === 'customers' ? 'zoho_customer_id' : 'zoho_invoice_id';

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
        extractedId = normalizedRow['customerid'] || normalizedRow['primarycontactid'] || normalizedRow['companyname'];
      } else {
        // For invoices, it MUST find the invoiceid
        extractedId = normalizedRow['invoiceid'];
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
        raw_data: row,
        synced_at: new Date().toISOString()
      };

      // For invoices, use Company Name as the customer link
      if (type === 'invoices') {
        record.zoho_customer_id = normalizedRow['companyname'] || null;
      }

      return record;
    });

    console.log(`Processing ${records.length} ${type} records...`);

    // Perform the upsert (now securely restricted by our new RLS policies)
    const { data: result, error } = await supabase
      .from(tableName)
      .upsert(records, { onConflict: conflictColumn });

    if (error) {
      console.error('Upsert error:', error);
      return new Response(
        JSON.stringify({ error: error.message, details: error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the import
    await supabase.from('zoho_sync_log').insert({
      sync_type: `manual_${type}_import`,
      status: 'success',
      records_synced: records.length
    });

    console.log(`✅ Successfully imported ${records.length} ${type}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: records.length,
        message: `Successfully imported ${records.length} ${type}`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Import error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        type: error.name
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});