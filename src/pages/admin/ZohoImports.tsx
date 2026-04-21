import { useMemo, useState } from "react";
import Papa from "papaparse";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";

type ImportType = "customers" | "invoices";

const NONE = "__none__";

const customerFields = [
  { key: "zoho_customer_id", label: "Customer ID *", required: true, hints: ["customer id", "contact id", "zoho id"] },
  { key: "display_name", label: "Display name *", required: true, hints: ["display name", "customer name", "contact name", "name"] },
  { key: "company_name", label: "Company name", hints: ["company name", "company"] },
  { key: "email", label: "Email", hints: ["email", "email address", "primary email"] },
  { key: "phone", label: "Phone", hints: ["phone", "mobile", "phone number"] },
  { key: "currency_code", label: "Currency", hints: ["currency", "currency code"] },
  { key: "outstanding_receivable", label: "Outstanding (ZAR)", hints: ["outstanding receivable", "receivables", "outstanding", "balance"] },
  { key: "status", label: "Status", hints: ["status", "customer status"] },
];

const invoiceFields = [
  { key: "invoice_number", label: "Invoice number *", required: true, hints: ["invoice number", "invoice no", "invoice#", "invoice"] },
  { key: "zoho_customer_id", label: "Customer ID", hints: ["customer id", "contact id"] },
  { key: "customer_name", label: "Customer name", hints: ["customer name", "contact name", "client name"] },
  { key: "invoice_date", label: "Invoice date", hints: ["invoice date", "date"] },
  { key: "due_date", label: "Due date", hints: ["due date", "duedate"] },
  { key: "status", label: "Status", hints: ["invoice status", "status"] },
  { key: "total", label: "Total", hints: ["total", "invoice total", "amount"] },
  { key: "balance", label: "Balance", hints: ["balance", "outstanding", "balance due"] },
  { key: "currency_code", label: "Currency", hints: ["currency", "currency code"] },
];

type FieldDef = (typeof customerFields)[number];

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

const autoMap = (headers: string[], fields: FieldDef[]) => {
  const map: Record<string, string> = {};
  for (const field of fields) {
    const match = headers.find((h) => {
      const n = normalize(h);
      return field.hints.some((hint) => n === normalize(hint) || n.includes(normalize(hint)));
    });
    if (match) map[field.key] = match;
  }
  return map;
};

const parseDate = (v: unknown): string | null => {
  if (!v) return null;
  const s = String(v).trim();
  if (!s) return null;
  // Try ISO first
  const iso = new Date(s);
  if (!isNaN(iso.getTime())) return iso.toISOString().slice(0, 10);
  // dd/mm/yyyy
  const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (m) {
    const [, d, mo, y] = m;
    const yr = y.length === 2 ? `20${y}` : y;
    return `${yr}-${mo.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
};

const parseNumber = (v: unknown): number => {
  if (v === null || v === undefined || v === "") return 0;
  const cleaned = String(v).replace(/[^0-9.\-]/g, "");
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
};

const ZohoImports = () => {
  const [importType, setImportType] = useState<ImportType>("invoices");
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [fileName, setFileName] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

  const fields = importType === "customers" ? customerFields : invoiceFields;

  const requiredOk = useMemo(
    () => fields.filter((f) => f.required).every((f) => mapping[f.key]),
    [fields, mapping],
  );

  const handleFile = (file: File) => {
    setResult(null);
    setFileName(file.name);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (res) => {
        const data = res.data.filter((r) => Object.values(r).some((v) => v && String(v).trim()));
        const hdrs = res.meta.fields ?? [];
        setRows(data);
        setHeaders(hdrs);
        setMapping(autoMap(hdrs, fields));
        toast({ title: "File loaded", description: `${data.length} rows detected in ${file.name}` });
      },
      error: (err) => {
        toast({ title: "Could not parse file", description: err.message, variant: "destructive" });
      },
    });
  };

  const handleTypeChange = (val: string) => {
    const t = val as ImportType;
    setImportType(t);
    setMapping(headers.length ? autoMap(headers, t === "customers" ? customerFields : invoiceFields) : {});
    setResult(null);
  };

  const buildPayload = (row: Record<string, string>) => {
    const out: Record<string, unknown> = { raw_payload: row };
    for (const field of fields) {
      const src = mapping[field.key];
      if (!src) continue;
      const val = row[src];
      if (field.key === "invoice_date" || field.key === "due_date") {
        out[field.key] = parseDate(val);
      } else if (field.key === "total" || field.key === "balance" || field.key === "outstanding_receivable") {
        out[field.key] = parseNumber(val);
      } else {
        const trimmed = val ? String(val).trim() : null;
        out[field.key] = trimmed || null;
      }
    }
    return out;
  };

  const handleImport = async () => {
    if (!rows.length || !requiredOk) return;
    setImporting(true);
    setResult(null);
    const errors: string[] = [];
    let success = 0;
    let failed = 0;

    const table = importType === "customers" ? "zoho_customers" : "zoho_invoices";
    const conflictKey = importType === "customers" ? "zoho_customer_id" : "invoice_number";

    // Batch in chunks of 100
    const chunkSize = 100;
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize).map(buildPayload);
      // Filter out rows missing required key
      const valid = chunk.filter((r) => r[conflictKey]);
      const invalid = chunk.length - valid.length;
      failed += invalid;
      if (invalid) errors.push(`${invalid} row(s) skipped: missing ${conflictKey}`);

      if (valid.length) {
        const { error } = await supabase
          .from(table)
          // @ts-expect-error - dynamic table
          .upsert(valid, { onConflict: conflictKey });
        if (error) {
          failed += valid.length;
          errors.push(error.message);
        } else {
          success += valid.length;
        }
      }
    }

    setResult({ success, failed, errors: errors.slice(0, 5) });
    setImporting(false);
    if (success > 0) {
      toast({ title: "Import complete", description: `${success} record(s) imported successfully` });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-foreground">Imports</h1>
          <p className="text-sm text-muted-foreground mt-1">Upload Zoho Books CSV exports to sync customers and invoices.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">1. Choose what you're importing</CardTitle>
            <CardDescription>Pick the type of CSV you exported from Zoho Books.</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={importType} onValueChange={handleTypeChange}>
              <TabsList>
                <TabsTrigger value="invoices">Invoices</TabsTrigger>
                <TabsTrigger value="customers">Customers</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">2. Upload your CSV</CardTitle>
            <CardDescription>Export from Zoho Books → {importType === "invoices" ? "Sales → Invoices" : "Contacts → Customers"} → Export as CSV.</CardDescription>
          </CardHeader>
          <CardContent>
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-border rounded-xl p-8 cursor-pointer hover:bg-muted/30 transition-colors">
              <Upload className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">
                {fileName ? fileName : "Click to choose a CSV file"}
              </span>
              <span className="text-xs text-muted-foreground">{rows.length ? `${rows.length} rows loaded` : "CSV files only"}</span>
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </label>
          </CardContent>
        </Card>

        {headers.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">3. Map columns</CardTitle>
              <CardDescription>We auto-matched what we could. Review and adjust below.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-4">
                {fields.map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <Label className="text-xs">{field.label}</Label>
                    <Select
                      value={mapping[field.key] ?? NONE}
                      onValueChange={(v) =>
                        setMapping((prev) => {
                          const next = { ...prev };
                          if (v === NONE) delete next[field.key];
                          else next[field.key] = v;
                          return next;
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="— Not mapped —" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>— Not mapped —</SelectItem>
                        {headers.map((h) => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              {!requiredOk && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Missing required mapping</AlertTitle>
                  <AlertDescription>Please map the fields marked with * before importing.</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {rows.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">4. Preview (first 5 rows)</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {fields.filter((f) => mapping[f.key]).map((f) => (
                      <TableHead key={f.key}>{f.label.replace(" *", "")}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 5).map((r, i) => (
                    <TableRow key={i}>
                      {fields.filter((f) => mapping[f.key]).map((f) => (
                        <TableCell key={f.key} className="text-xs">{r[mapping[f.key]] || "—"}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {rows.length > 0 && (
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <Button onClick={handleImport} disabled={!requiredOk || importing} size="lg">
              {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
              {importing ? "Importing…" : `Import ${rows.length} ${importType}`}
            </Button>
            <p className="text-xs text-muted-foreground">Existing records (matched by {importType === "customers" ? "Customer ID" : "Invoice number"}) will be updated.</p>
          </div>
        )}

        {result && (
          <Alert variant={result.failed > 0 && result.success === 0 ? "destructive" : "default"}>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Import results</AlertTitle>
            <AlertDescription>
              <p>✓ {result.success} record(s) imported / updated</p>
              {result.failed > 0 && <p>✗ {result.failed} record(s) failed</p>}
              {result.errors.length > 0 && (
                <ul className="mt-2 text-xs list-disc pl-5">
                  {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              )}
            </AlertDescription>
          </Alert>
        )}
      </div>
    </DashboardLayout>
  );
};

export default ZohoImports;
