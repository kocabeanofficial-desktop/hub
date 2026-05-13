import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { Field } from "@/hooks/useWebsiteContent";

interface FieldEditorProps {
  field: Field;
  value: string;
  onChange: (value: string) => void;
}

export const FieldEditor = ({ field, value, onChange }: FieldEditorProps) => {
  const id = `field-${field.id}`;
  const t = field.field_type;

  const renderInput = () => {
    if (t === "textarea" || t === "rich_text") {
      return (
        <Textarea
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={t === "rich_text" ? 8 : 4}
          placeholder={field.default_value ?? ""}
        />
      );
    }
    if (t === "color") {
      return (
        <div className="flex items-center gap-2">
          <Input
            type="color"
            id={id}
            value={value || "#000000"}
            onChange={(e) => onChange(e.target.value)}
            className="h-10 w-16 p-1 cursor-pointer"
          />
          <Input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="#000000"
            className="flex-1"
          />
        </div>
      );
    }
    const inputType =
      t === "email"
        ? "email"
        : t === "phone"
          ? "tel"
          : t === "button_url" || t === "link" || t === "image"
            ? "url"
            : "text";
    return (
      <Input
        id={id}
        type={inputType}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={field.default_value ?? ""}
      />
    );
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id} className="text-sm font-medium text-foreground">
          {field.label}
        </Label>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground font-mono">
          {field.field_type}
        </span>
      </div>
      {renderInput()}
      {t === "image" && value && (
        <img
          src={value}
          alt={field.label}
          className="mt-2 h-20 rounded border border-border object-cover"
          onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
        />
      )}
    </div>
  );
};
