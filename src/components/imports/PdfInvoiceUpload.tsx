import { useCallback, useEffect, useState } from "react";
import { useDropzone } from "react-dropzone";
import { parse, format, isValid } from "date-fns";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "@/hooks/use-toast";
import { supabaseCloud } from "@/integrations/supabase/client";
import {
  FileText,
  UploadCloud,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  X,
  Save,
} from "lucide-react";
import { cn } from "@/lib/utils";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

type FieldKey = "invoice_number" | "invoice_date" | "due_date" | "amount_due" | "customer_name";

type ExtractStatus = Record<FieldKey, "found" | "missing" | "idle">;

const initialStatus: ExtractStatus = {
  invoice_number: "idle",
  invoice_date: "idle",
  due_date: "idle",
  amount_due: "idle",
  customer_name: "idle",
};

const dateFormats = ["d MMM yyyy", "d MMMM yyyy", "dd MMM yyyy", "dd MMMM yyyy"];

const parseHumanDate = (raw?: string | null): string => {
  if (!raw) return "";
  const cleaned = raw.trim().replace(/\s+/g, " ");
  for (const fmt of dateFormats) {
    const d = parse(cleaned, fmt, new Date());
    if (isValid(d)) return format(d, "yyyy-MM-dd");
  }
  return "";
};

const extractFields = (text: string) => {
  const invMatch = text.match(/(?:#\s*)?INV-(\d+)/i);
  const invoiceNumber = invMatch ? `INV-${invMatch[1]}` : "";

  const invoiceDateRaw = text.match(/Invoice Date\s*:\s*(\d{1,2}\s+\w+\s+\d{4})/i)?.[1] ?? "";
  const dueDateRaw = text.match(/Due Date\s*:\s*(\d{1,2}\s+\w+\s+\d{4})/i)?.[1] ?? "";

  const balanceRaw =
    text.match(/Balance Due\s*R?\s*([\d,]+\.?\d*)/i)?.[1] ??
    text.match(/Total\s*R?\s*([\d,]+\.?\d*)/i)?.[1] ??
    "";
  const amount = balanceRaw ? balanceRaw.replace(/,/g, "") : "";

  const customer = text.match(/Bill To\s+([^\n\r]+)/i)?.[1]?.trim() ?? "";

  return {
    invoice_number: invoiceNumber,
    invoice_date: parseHumanDate(invoiceDateRaw),
    due_date: parseHumanDate(dueDateRaw),
    amount_due: amount,
    customer_name: customer,
  };
};

export const PdfInvoiceUpload = () => {
  const [file, setFile] = useState<File | null>(null);
  const [parsing, setParsing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [status, setStatus] = useState<ExtractStatus>(initialStatus);

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [amountDue, setAmountDue] = useState("");
  const [customerName, setCustomerName] = useState("");

  const reset = useCallback(() => {
    setFile(null);
    setParseError(null);
    setStatus(initialStatus);
    setInvoiceNumber("");
    setInvoiceDate("");
    setDueDate("");
    setAmountDue("");
    setCustomerName("");
  }, []);

  const handleFile = useCallback(async (incoming: File) => {
    reset();
    setFile(incoming);
    setParsing(true);
    try {
      const buffer = await incoming.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
      let fullText = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" ");
        fullText += pageText + "\n";
      }

      const fields = extractFields(fullText);
      setInvoiceNumber(fields.invoice_number);
      setInvoiceDate(fields.invoice_date);
      setDueDate(fields.due_date);
      setAmountDue(fields.amount_due);
      setCustomerName(fields.customer_name);

      setStatus({
        invoice_number: fields.invoice_number ? "found" : "missing",
        invoice_date: fields.invoice_date ? "found" : "missing",
        due_date: fields.due_date ? "found" : "missing",
        amount_due: fields.amount_due ? "found" : "missing",
        customer_name: fields.customer_name ? "found" : "missing",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not read PDF";
      setParseError(msg);
      toast({ title: "PDF parse failed", description: msg, variant: "destructive" });
    } finally {
      setParsing(false);
    }
  }, [reset]);

  const onDrop = useCallback(
    (accepted: File[]) => {
      const f = accepted[0];
      if (f) void handleFile(f);
    },
    [handleFile],
  );

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: { "application/pdf": [".pdf"] },
    multiple: false,
    disabled: parsing || saving,
  });

  const canSave =
    !!file &&
    invoiceNumber.trim().length > 0 &&
    invoiceDate.length > 0 &&
    Number.parseFloat(amountDue) > 0;

  const handleSave = async () => {
    if (!file || !canSave) return;
    setSaving(true);
    try {
      const { data: { user } } = await supabaseCloud.auth.getUser();
      const { data: { session } } = await supabaseCloud.auth.getSession();
      if (!user || !session) {
        // Fall back: storage RLS requires Cloud auth; if user only has external session, this won't work.
        throw new Error("You must be signed in to Lovable Cloud to save invoices.");
      }

      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${user.id}/${Date.now()}_${safeName}`;

      const { error: uploadError } = await supabaseCloud.storage
        .from("invoice-pdfs")
        .upload(path, file, { contentType: "application/pdf", upsert: false });
      if (uploadError) throw uploadError;

      const { data: signed } = await supabaseCloud.storage
        .from("invoice-pdfs")
        .createSignedUrl(path, 60 * 60 * 24 * 365);

      const pdf_url = signed?.signedUrl ?? path;

      const { error: insertError } = await supabaseCloud
        .from("manual_invoices")
        .insert({
          invoice_number: invoiceNumber.trim(),
          invoice_date: invoiceDate,
          due_date: dueDate || null,
          amount_due: Number.parseFloat(amountDue),
          customer_name: customerName.trim() || null,
          pdf_url,
          uploaded_by: user.id,
        });
      if (insertError) throw insertError;

      toast({
        title: "Invoice saved",
        description: `Invoice ${invoiceNumber} saved successfully!`,
      });
      reset();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not save invoice";
      toast({ title: "Save failed", description: msg, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Smart PDF Invoice Upload
        </CardTitle>
        <CardDescription>
          Drop a Koca Bean invoice PDF and we'll auto-fill the fields. Edit anything before saving.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div
          {...getRootProps()}
          className={cn(
            "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors cursor-pointer",
            isDragActive && !isDragReject && "border-primary bg-primary/5",
            isDragReject && "border-destructive bg-destructive/5",
            !isDragActive && "border-border hover:bg-muted/30",
            (parsing || saving) && "opacity-60 pointer-events-none",
          )}
        >
          <input {...getInputProps()} />
          {parsing ? (
            <>
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <span className="text-sm font-medium">Processing PDF…</span>
            </>
          ) : (
            <>
              <UploadCloud className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm font-medium">
                {isDragActive ? "Drop the PDF here" : "Drag PDF here or click to browse"}
              </span>
              <span className="text-xs text-muted-foreground">PDF only · max 1 file</span>
            </>
          )}
        </div>

        {file && (
          <div className="flex items-center justify-between gap-3 rounded-md border bg-muted/30 px-3 py-2">
            <div className="flex items-center gap-2 text-sm min-w-0">
              <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{file.name}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={reset} disabled={parsing || saving}>
              <X className="h-4 w-4" />
              Clear
            </Button>
          </div>
        )}

        {parseError && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>PDF parsing failed</AlertTitle>
            <AlertDescription>{parseError} You can still enter the fields manually.</AlertDescription>
          </Alert>
        )}

        {(file || parseError) && (
          <div className="grid sm:grid-cols-2 gap-4">
            <FieldRow
              label="Invoice Number *"
              status={status.invoice_number}
              input={
                <Input
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="INV-0843"
                />
              }
            />
            <FieldRow
              label="Customer"
              status={status.customer_name}
              input={
                <Input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Customer name"
                />
              }
            />
            <FieldRow
              label="Invoice Date *"
              status={status.invoice_date}
              input={
                <Input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                />
              }
            />
            <FieldRow
              label="Due Date"
              status={status.due_date}
              input={
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              }
            />
            <FieldRow
              label="Amount Due (ZAR) *"
              status={status.amount_due}
              input={
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amountDue}
                  onChange={(e) => setAmountDue(e.target.value)}
                  placeholder="0.00"
                />
              }
            />
          </div>
        )}

        {file && (
          <div className="flex flex-col sm:flex-row gap-2 justify-end">
            <Button variant="outline" onClick={reset} disabled={parsing || saving}>
              Clear &amp; Upload Different PDF
            </Button>
            <Button onClick={handleSave} disabled={!canSave || saving || parsing}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? "Saving…" : "Save Invoice"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const FieldRow = ({
  label,
  status,
  input,
}: {
  label: string;
  status: "found" | "missing" | "idle";
  input: React.ReactNode;
}) => (
  <div className="space-y-1.5">
    <Label className="text-xs">{label}</Label>
    {input}
    {status === "found" && (
      <p className="text-xs text-primary flex items-center gap-1">
        <CheckCircle2 className="h-3 w-3" /> Auto-filled from PDF
      </p>
    )}
    {status === "missing" && (
      <p className="text-xs text-destructive flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" /> Not found — please enter manually
      </p>
    )}
  </div>
);

export default PdfInvoiceUpload;
