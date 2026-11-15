import { NextRequest, NextResponse } from "next/server";
import { commitImportBatch } from "@/features/imports/import-repository";
import type { ImportedGift } from "@/features/imports/source-adapter";
import type { GivingSource } from "@/lib/domain/types";

export async function POST(request: NextRequest) {
  let body: { gifts?: ImportedGift[]; source?: GivingSource; fileName?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (!Array.isArray(body.gifts) || body.gifts.length === 0 || !body.source) {
    return NextResponse.json({ error: "Missing gifts or source." }, { status: 400 });
  }

  const result = await commitImportBatch(body.gifts, body.source, body.fileName ?? "unknown");

  if (result.error) {
    const status = result.error.startsWith("Not authenticated") ? 401 : 500;
    return NextResponse.json({ error: result.error }, { status, headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
}
