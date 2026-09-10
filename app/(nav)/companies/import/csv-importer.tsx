"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import {
  AlertTriangleIcon,
  CheckCircle2Icon,
  CircleAlertIcon,
  UploadIcon,
} from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { normalizeDomain } from "@/app/api/companies/schema";
import {
  validateImportRow,
  type ImportRow,
  type ImportSummary,
} from "@/app/api/companies/import/schema";

type Field = "name" | "domain" | "industry" | "source";
type Mapping = Record<Field, string>;

const FIELDS: { key: Field; label: string; required?: boolean }[] = [
  { key: "name", label: "Name", required: true },
  { key: "domain", label: "Domain" },
  { key: "industry", label: "Industry" },
  { key: "source", label: "Source" },
];

const HEADER_HINTS: Record<Field, string[]> = {
  name: ["name", "company", "company name", "account", "account name"],
  domain: ["domain", "website", "url", "site", "web"],
  industry: ["industry", "sector", "vertical"],
  source: ["source", "channel", "origin"],
};

const UNMAPPED = "__unmapped";
const PREVIEW_ROWS = 5;

type PreviewRow = ImportRow & {
  status: "ok" | "error" | "duplicate";
  message?: string;
  existingId?: string;
  existingName?: string;
};

function autoMap(headers: string[]): Mapping {
  const mapping: Mapping = { name: "", domain: "", industry: "", source: "" };
  const taken = new Set<string>();

  for (const { key } of FIELDS) {
    const hit = headers.find(
      (header) =>
        !taken.has(header) &&
        HEADER_HINTS[key].includes(header.trim().toLowerCase()),
    );
    if (hit) {
      mapping[key] = hit;
      taken.add(hit);
    }
  }

  return mapping;
}

/**
 * INV-23. Parsing and the preview happen in the browser so column mapping is
 * instant; the server re-validates every row it is sent and is the thing that
 * actually decides what gets created (CLAUDE.md section 6). Both sides call
 * validateImportRow(), so the preview shows the same verdict the import will
 * reach.
 */
export function CsvImporter({
  existingCompanies,
}: {
  existingCompanies: { id: string; name: string; domain: string | null }[];
}) {
  const router = useRouter();
  const [fileName, setFileName] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Mapping>({
    name: "",
    domain: "",
    industry: "",
    source: "",
  });
  const [includeDuplicates, setIncludeDuplicates] = useState(false);
  const [importing, setImporting] = useState(false);
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const existingByDomain = useMemo(() => {
    const map = new Map<string, { id: string; name: string }>();
    for (const company of existingCompanies) {
      if (company.domain) {
        map.set(normalizeDomain(company.domain), {
          id: company.id,
          name: company.name,
        });
      }
    }
    return map;
  }, [existingCompanies]);

  const importRows: ImportRow[] = useMemo(() => {
    const pick = (raw: Record<string, string>, header: string) =>
      header ? (raw[header] ?? "").trim() : "";

    return rawRows.map((raw, index) => ({
      // Line 1 is the header row, so the first data row is line 2.
      lineNumber: index + 2,
      name: pick(raw, mapping.name),
      domain: pick(raw, mapping.domain),
      industry: pick(raw, mapping.industry),
      source: pick(raw, mapping.source),
    }));
  }, [rawRows, mapping]);

  // Mirrors the server loop exactly, including the running set of domains
  // claimed by earlier rows in this same file.
  const previewRows: PreviewRow[] = useMemo(() => {
    const claimed = new Map(existingByDomain);

    return importRows.map((row) => {
      const verdict = validateImportRow(row);
      if (!verdict.ok) {
        return { ...row, status: "error" as const, message: verdict.message };
      }

      const key = verdict.data.domain ? normalizeDomain(verdict.data.domain) : null;
      const clash = key ? claimed.get(key) : undefined;

      if (clash) {
        return {
          ...row,
          status: "duplicate" as const,
          message: "A company already uses this domain",
          existingId: clash.id,
          existingName: clash.name,
        };
      }

      if (key) claimed.set(key, { id: "", name: row.name });
      return { ...row, status: "ok" as const };
    });
  }, [importRows, existingByDomain]);

  const counts = useMemo(
    () => ({
      ok: previewRows.filter((r) => r.status === "ok").length,
      error: previewRows.filter((r) => r.status === "error").length,
      duplicate: previewRows.filter((r) => r.status === "duplicate").length,
    }),
    [previewRows],
  );

  function handleFile(file: File) {
    setSummary(null);
    setFileName(file.name);

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: false,
      complete: (results) => {
        const fields = results.meta.fields ?? [];
        if (fields.length === 0) {
          toast.error("Could not read a header row from that file.");
          setHeaders([]);
          setRawRows([]);
          return;
        }

        // A trailing newline parses as one all-empty row. Drop those from the
        // end only - a blank row in the middle stays, and gets reported at its
        // real line number rather than vanishing.
        const rows = [...results.data];
        const isBlank = (row: Record<string, string>) =>
          fields.every((field) => (row[field] ?? "").trim() === "");
        while (rows.length > 0 && isBlank(rows[rows.length - 1])) rows.pop();

        setHeaders(fields);
        setRawRows(rows);
        setMapping(autoMap(fields));
      },
      error: () => toast.error("Could not parse that file."),
    });
  }

  async function runImport() {
    setImporting(true);

    const res = await fetch("/api/companies/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: importRows, includeDuplicates }),
    });

    setImporting(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      toast.error(body?.error ?? "Import failed.");
      return;
    }

    const { data } = (await res.json()) as { data: ImportSummary };
    setSummary(data);
    toast.success(`${data.created} ${data.created === 1 ? "company" : "companies"} created.`);
    router.refresh();
  }

  const columns: ColumnDef<PreviewRow>[] = [
    { accessorKey: "lineNumber", header: "Line", enableSorting: false },
    { accessorKey: "name", header: "Name", enableSorting: false },
    { accessorKey: "domain", header: "Domain", enableSorting: false },
    { accessorKey: "industry", header: "Industry", enableSorting: false },
    { accessorKey: "source", header: "Source", enableSorting: false },
    {
      id: "status",
      header: "Status",
      enableSorting: false,
      cell: ({ row }) => {
        const preview = row.original;

        if (preview.status === "ok") {
          return (
            <span className="text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2Icon className="size-3.5 text-emerald-600" />
              Will be created
            </span>
          );
        }

        if (preview.status === "duplicate") {
          return (
            <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-500">
              <AlertTriangleIcon className="size-3.5" />
              Duplicate of{" "}
              {preview.existingId ? (
                <Link
                  href={`/companies/${preview.existingId}`}
                  target="_blank"
                  className="underline"
                >
                  {preview.existingName}
                </Link>
              ) : (
                "an earlier row"
              )}
            </span>
          );
        }

        return (
          <span className="text-destructive flex items-center gap-1.5">
            <CircleAlertIcon className="size-3.5" />
            {preview.message}
          </span>
        );
      },
    },
  ];

  return (
    <div className="grid gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">1 · Choose a file</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          <Input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
            className="h-auto py-1.5"
          />
          <p className="text-muted-foreground text-xs">
            The first line must be a header row. Columns are mapped below.
          </p>
        </CardContent>
      </Card>

      {headers.length > 0 ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">2 · Map columns</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {FIELDS.map(({ key, label, required }) => (
                <div key={key} className="grid gap-2">
                  <Label>
                    {label}
                    {required ? " (required)" : ""}
                  </Label>
                  <Select
                    value={mapping[key] || UNMAPPED}
                    onValueChange={(value) =>
                      setMapping((prev) => ({
                        ...prev,
                        [key]: value === UNMAPPED ? "" : value,
                      }))
                    }
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Not mapped" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={UNMAPPED}>Not mapped</SelectItem>
                      {headers.map((header) => (
                        <SelectItem key={header} value={header}>
                          {header}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="text-base">
                3 · Preview{" "}
                <span className="text-muted-foreground font-normal">
                  (first {Math.min(PREVIEW_ROWS, previewRows.length)} of{" "}
                  {previewRows.length} rows)
                </span>
              </CardTitle>
              <p className="text-muted-foreground text-xs">
                {counts.ok} ready · {counts.duplicate} duplicate ·{" "}
                {counts.error} invalid
              </p>
            </CardHeader>
            <CardContent className="grid gap-4">
              <DataTable
                columns={columns}
                data={previewRows.slice(0, PREVIEW_ROWS)}
              />

              {counts.duplicate > 0 ? (
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={includeDuplicates}
                    onCheckedChange={(checked) =>
                      setIncludeDuplicates(checked === true)
                    }
                  />
                  Import the {counts.duplicate} duplicate{" "}
                  {counts.duplicate === 1 ? "row" : "rows"} anyway
                </label>
              ) : null}

              <div className="flex items-center gap-2">
                <Button
                  onClick={runImport}
                  disabled={importing || !mapping.name || previewRows.length === 0}
                >
                  <UploadIcon />
                  {importing
                    ? "Importing…"
                    : `Import ${
                        includeDuplicates
                          ? counts.ok + counts.duplicate
                          : counts.ok
                      } of ${previewRows.length} rows`}
                </Button>
                {!mapping.name ? (
                  <p className="text-destructive text-sm">
                    Map a Name column before importing.
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}

      {summary ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Imported {fileName ? `“${fileName}”` : "file"}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <p className="text-sm">
              <span className="font-medium">{summary.created} created</span>
              {summary.reported > 0 ? ` · ${summary.reported} reported` : null}
            </p>

            {summary.reported > 0 ? (
              <ul className="grid gap-1.5 text-sm">
                {summary.results
                  .filter((result) => result.status !== "created")
                  .map((result) => (
                    <li
                      key={result.lineNumber}
                      className="flex items-center gap-2"
                    >
                      <span className="text-muted-foreground w-16 shrink-0 text-xs">
                        Line {result.lineNumber}
                      </span>
                      {result.status === "duplicate" ? (
                        <span className="flex items-center gap-1.5 text-amber-700 dark:text-amber-500">
                          <AlertTriangleIcon className="size-3.5" />
                          {result.message} —{" "}
                          <Link
                            href={`/companies/${result.existingId}`}
                            target="_blank"
                            className="underline"
                          >
                            view it
                          </Link>
                        </span>
                      ) : (
                        <span className="text-destructive flex items-center gap-1.5">
                          <CircleAlertIcon className="size-3.5" />
                          {result.message}
                        </span>
                      )}
                    </li>
                  ))}
              </ul>
            ) : null}

            <div>
              <Button asChild size="sm" variant="outline">
                <Link href="/companies">Back to companies</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
