"use client";

import Link from "next/link";
import { useState } from "react";
import { demoDonors, demoMembers, donorGiving } from "@/lib/demo/data";
import { formatMoney } from "@/lib/domain/rules";

export function DonorDirectory() {
  const [query, setQuery] = useState("");
  const [owner, setOwner] = useState("");
  const rows = demoDonors.filter((d) => d.name.toLowerCase().includes(query.trim().toLowerCase()) && (!owner || d.ownerId === owner));
  return <><form className="filters" onSubmit={(event) => event.preventDefault()} role="search" aria-label="Find donors">
    <label>Search donors<input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name" /></label>
    <label>Board-member owner<select value={owner} onChange={(e) => setOwner(e.target.value)}><option value="">All owners</option>{demoMembers.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
  </form><p role="status" aria-live="polite">{rows.length} {rows.length === 1 ? "relationship" : "relationships"}</p>
  <div className="table-scroll"><table><caption>Fictional donor directory · USD giving through November 14, 2026</caption><thead><tr><th scope="col">Donor</th><th scope="col">Owner</th><th scope="col">2026 giving</th><th scope="col">Sources</th></tr></thead>
    <tbody>{rows.length ? rows.map((d) => <tr key={d.id}><td><Link href={`/donors/${d.id}`}>{d.name}</Link><small>{d.kind}</small></td><td>{demoMembers.find((m) => m.id === d.ownerId)?.name}</td><td>{formatMoney(donorGiving(d.id, 2026))}</td><td>{d.sources.join(", ")}</td></tr>) : <tr><td colSpan={4}>No donors match these filters. Try another name or owner.</td></tr>}</tbody>
  </table></div></>;
}
