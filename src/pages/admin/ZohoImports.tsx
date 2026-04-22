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
import { PdfInvoiceUpload } from "@/components/imports/PdfInvoiceUpload";

type ImportType = "customers" | "invoices";

const NONE = "__none__";

// Only the key fields are mapped explicitly. The full CSV row is stored in raw_data.
const customerKeyFields = [
  {
    key: "zoho_customer_id",
    label: "Customer ID *",
    required: true,
    hints: ["customer id", "contact id", "zoho id"],
  },
] as const;

const invoiceKeyFields = [
  {
    key: "zoho_invoice_id",
    label: "Invoice ID *",
    required: true,
    hints: ["invoice id", "invoice number", "invoice no", "invoice#", "invoice"],
  },
  {
    key: "zoho_customer_id",
    label: "Customer ID *",
    required: true,
    hints: ["customer id", "contact id", "zoho customer id"],
  },
] as const;

type FieldDef = { key: string; label: string; required?: boolean; hints: readonly string[] };

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

const autoMap = (headers: string[], fields: readonly FieldDef[]) => {
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

const ZohoImports = () => {
  const [importType, setImportType] = useState<ImportType>("invoices");
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [fileName, setFileName] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

  const fields: readonly FieldDef[] = importType === "customers" ? customerKeyFields : invoiceKeyFields;

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
    const nextFields = t === "customers" ? customerKeyFields : invoiceKeyFields;
    setMapping(headers.length ? autoMap(headers, nextFields) : {});
    setResult(null);
  };

  const buildPayload = (row: Record<string, string>) => {
    const now = new Date().toISOString();
    if (importType === "customers") {
      const customerIdSrc = mapping["zoho_customer_id"];
      const customerId = customerIdSrc ? String(row[customerIdSrc] ?? "").trim() : "";
      if (!customerId) return null;
      return {
        zoho_customer_id: customerId,
        raw_data: row,
        synced_at: now,
      };
    }
    const invoiceIdSrc = mapping["zoho_invoice_id"];
    const customerIdSrc = mapping["zoho_customer_id"];
    const invoiceId = invoiceIdSrc ? String(row[invoiceIdSrc] ?? "").trim() : "";
    const customerId = customerIdSrc ? String(row[customerIdSrc] ?? "").trim() : "";
    if (!invoiceId) return null;
    return {
      zoho_invoice_id: invoiceId,
      zoho_customer_id: customerId || null,
      raw_data: row,
      synced_at: now,
    };
  };

  const handleImport = async () => {
    if (!rows.length || !requiredOk) return;
    setImporting(true);
    setResult(null);
    const errors: string[] = [];
    let success = 0;
    let failed = 0;

    const conflictKey = importType === "customers" ? "zoho_customer_id" : "zoho_invoice_id";

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error("You must be logged in to import data.");
      }

      const allPayloads = rows.map(buildPayload);
      const validPayloads = allPayloads.filter((r): r is NonNullable<typeof r> => r !== null);
      const invalidCount = allPayloads.length - validPayloads.length;
      if (invalidCount) {
        failed += invalidCount;
        errors.push(`${invalidCount} row(s) skipped: missing ${conflictKey}`);
      }

      const chunkSize = 100;
      for (let i = 0; i < validPayloads.length; i += chunkSize) {
        const chunk = validPayloads.slice(i, i + chunkSize);

        const response = await fetch(
          "https://yxccaoiznqklgnxdsdlr.supabase.co/functions/v1/zoho-csv-import",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ type: importType, data: chunk }),
          },
        );

        if (!response.ok) {
          const text = await response.text().catch(() => "");
          let message = `Import failed (${response.status})`;
          try {
            const parsed = text ? JSON.parse(text) : null;
            if (parsed?.error) message = parsed.error;
            else if (parsed?.message) message = parsed.message;
            else if (text) message = text;
          } catch {
            if (text) message = text;
          }
          failed += chunk.length;
          errors.push(message);
          continue;
        }

        const payload = await response.json().catch(() => ({}));
        const successCount = typeof payload?.success === "number" ? payload.success : chunk.length;
        const failedCount = typeof payload?.failed === "number" ? payload.failed : 0;
        success += successCount;
        failed += failedCount;
        if (Array.isArray(payload?.errors)) {
          for (const e of payload.errors) errors.push(String(e));
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Import failed";
      errors.push(message);
      toast({ title: "Import failed", description: message, variant: "destructive" });
    }

    setResult({ success, failed, errors: errors.slice(0, 5) });
    setImporting(false);
    if (success > 0) {
      toast({ title: "Import complete", description: `${success} record(s) imported successfully` });
    }
  };

  const previewHeaders = headers.slice(0, 6);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-heading font-extrabold text-foreground">Imports</h1>
          <p className="text-sm text-muted-foreground mt-1">Upload Zoho Books CSV exports to sync customers and invoices, or upload a single invoice PDF.</p>
        </div>

        <PdfInvoiceUpload />

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
            <CardDescription>
              Export from Zoho Books → {importType === "invoices" ? "Sales → Invoices" : "Contacts → Customers"} → Export as CSV.
            </CardDescription>
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
              <CardTitle className="text-base">3. Map key columns</CardTitle>
              <CardDescription>
                Only the ID columns need to be mapped. Every other column is stored automatically.
              </CardDescription>
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
              <CardDescription>Showing the first {previewHeaders.length} of {headers.length} columns. All columns are stored.</CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {previewHeaders.map((h) => (
                      <TableHead key={h}>{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.slice(0, 5).map((r, i) => (
                    <TableRow key={i}>
                      {previewHeaders.map((h) => (
                        <TableCell key={h} className="text-xs">{r[h] || "—"}</TableCell>
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
            <p className="text-xs text-muted-foreground">
              Existing records (matched by {importType === "customers" ? "Customer ID" : "Invoice ID"}) will be updated.
            </p>
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
