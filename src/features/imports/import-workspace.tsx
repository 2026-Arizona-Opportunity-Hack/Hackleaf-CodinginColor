"use client";

import { useState } from "react";
import { PageHeading } from "@/components/page-heading";
import { normalizeEmail } from "@/lib/domain/rules";
import type { GivingSource } from "@/lib/domain/types";
import { parseCsv } from "./csv-parser";
import { adaptRow, validateHeaders, type ImportedGift } from "./source-adapter";

const SOURCES: { value: GivingSource; label: string }[] = [
  { value: "spreadsheet", label: "Spreadsheet" },
  { value: "zeffy", label: "Zeffy" },
  { value: "benevity", label: "Benevity" },
];

const MAX_FILE_BYTES = 1_048_576;

interface Preview {
  valid: ImportedGift[];
  errors: { row: number; message: string }[];
  truncated: boolean;
}

export function ImportWorkspace() {
  const [source, setSource] = useState<GivingSource>("spreadsheet");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  function handleFile(file: File) {
    setFileError(null);
    setPreview(null);
    if (file.size > MAX_FILE_BYTES) {
      setFileError("File exceeds 1 MB. Split the export and import in batches.");
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const parsed = parseCsv(text);
      if (!parsed.ok) { setFileError(parsed.message); return; }
      const headerErr = validateHeaders(parsed.headers);
      if (headerErr) { setFileError(headerErr); return; }

      const valid: ImportedGift[] = [];
      const errors: { row: number; message: string }[] = [];
      parsed.rows.forEach((row, i) => {
        const result = adaptRow(row, source, i + 2);
        if (result.data) valid.push(result.data);
        else if (result.error) errors.push({ row: i + 2, message: result.error });
      });
      setPreview({ valid, errors, truncated: parsed.truncated });
    };
    reader.readAsText(file);
  }

  const sharedEmails = (() => {
    if (!preview) return [];
    const groups = new Map<string, ImportedGift[]>();
    for (const gift of preview.valid) {
      if (!gift.donor.email) continue;
      const key = normalizeEmail(gift.donor.email);
      const group = groups.get(key) ?? [];
      group.push(gift);
      groups.set(key, group);
    }
    return [...groups.entries()].filter(([, g]) => g.length > 1);
  })();

  return (
    <>
      <PageHeading
        title="One donor record. Every source."
        description="Preview and validate before any data is changed."
      />

      <section>
        <h2>Import settings</h2>
        <form className="filters" onSubmit={(e) => e.preventDefault()}>
          <label>
            Source
            <select value={source} onChange={(e) => setSource(e.target.value as GivingSource)}>
              {SOURCES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>
          <label>
            CSV file
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            />
          </label>
        </form>
        <p><a href={`/samples/${source}.csv`} download>Download fictional {source} sample</a></p>
      </section>

      {fileError && <p role="alert" className="error-notice">{fileError}</p>}

      {preview && (
        <>
          <section>
            <h2>Preview — {fileName}</h2>
            <p role="status" aria-live="polite">
              {preview.valid.length} valid row{preview.valid.length !== 1 ? "s" : ""}
              {preview.errors.length > 0 ? `, ${preview.errors.length} error${preview.errors.length !== 1 ? "s" : ""}` : ""}
              {preview.truncated ? " · file truncated at 1,000 rows" : ""}
            </p>

            {preview.errors.length > 0 && (
              <details open>
                <summary>Row errors ({preview.errors.length})</summary>
                <ul className="simple-list">
                  {preview.errors.map((e) => <li key={e.row}>Row {e.row}: {e.message}</li>)}
                </ul>
              </details>
            )}

            {sharedEmails.length > 0 && (
              <details open>
                <summary>Shared-email matches requiring review ({sharedEmails.length})</summary>
                <ul className="simple-list">
                  {sharedEmails.map(([email, group]) => (
                    <li key={email}>
                      <strong>{email}</strong> — {group.map((g) => g.donor.name).join(", ")}
                      {" · "}confirm whether these rows are the same person before committing
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {preview.valid.length > 0 && (
              <div className="table-scroll">
                <table>
                  <caption>Fictional preview · {source} · {preview.valid.length} row{preview.valid.length !== 1 ? "s" : ""}</caption>
                  <thead>
                    <tr>
                      <th scope="col">Source ID</th>
                      <th scope="col">Name</th>
                      <th scope="col">Email</th>
                      <th scope="col">Amount (USD)</th>
                      <th scope="col">Date</th>
                      <th scope="col">Program</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.valid.map((gift) => (
                      <tr key={gift.sourceRecordId}>
                        <td>{gift.sourceRecordId}</td>
                        <td>{gift.donor.name}</td>
                        <td>{gift.donor.email ?? "—"}</td>
                        <td>${(gift.amountCents / 100).toFixed(2)}</td>
                        <td>{gift.receivedOn}</td>
                        <td>{gift.programId}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section>
            <h2>Commit</h2>
            <p>
              Transactional import requires Kaustubh&apos;s authenticated commit primitive (not yet merged).
              Resolve all row errors and shared-email matches before committing.
              This preview does not modify any data.
            </p>
            <button type="button" disabled aria-disabled="true">
              Commit {preview.valid.length} row{preview.valid.length !== 1 ? "s" : ""} (pending)
            </button>
          </section>
        </>
      )}
    </>
  );
}
