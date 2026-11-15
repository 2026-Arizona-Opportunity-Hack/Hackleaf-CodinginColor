import { NextRequest, NextResponse } from "next/server";
import { parseCsv } from "@/features/imports/csv-parser";
import { adaptRow, validateHeaders } from "@/features/imports/source-adapter";
import type { GivingSource } from "@/lib/domain/types";

const MAX_FILE_BYTES = 1_048_576;

export async function POST(request: NextRequest) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data." }, { status: 400 });
  }

  const file = form.get("file");
  const source = form.get("source") as GivingSource | null;

  if (!(file instanceof File) || !source) {
    return NextResponse.json({ error: "Missing file or source." }, { status: 400 });
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json({ error: "File exceeds 1 MB." }, { status: 413 });
  }

  const text = await file.text();
  const parsed = parseCsv(text);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.message }, { status: 422 });
  }

  const headerErr = validateHeaders(parsed.headers);
  if (headerErr) {
    return NextResponse.json({ error: headerErr }, { status: 422 });
  }

  const valid: ReturnType<typeof adaptRow>["data"][] = [];
  const errors: { row: number; message: string }[] = [];
  parsed.rows.forEach((row, i) => {
    const result = adaptRow(row, source, i + 2);
    if (result.data) valid.push(result.data);
    else if (result.error) errors.push({ row: i + 2, message: result.error });
  });

  return NextResponse.json(
    { rows: valid.filter(Boolean), errors, truncated: parsed.truncated },
    { headers: { "Cache-Control": "no-store" } },
  );
}
