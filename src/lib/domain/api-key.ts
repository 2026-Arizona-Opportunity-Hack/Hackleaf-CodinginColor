import { timingSafeEqual } from "node:crypto";

export function validReportingKey(header: string | null, expected: string | undefined): boolean {
  if (!expected || expected.length < 32 || !header?.startsWith("Bearer ")) return false;
  const supplied = Buffer.from(header.slice(7));
  const secret = Buffer.from(expected);
  return supplied.length === secret.length && timingSafeEqual(supplied, secret);
}
