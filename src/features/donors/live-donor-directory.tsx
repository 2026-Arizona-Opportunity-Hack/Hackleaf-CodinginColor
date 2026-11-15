"use client";

import { useState } from "react";
import Link from "next/link";
import { formatMoney } from "@/lib/domain/rules";
import type { LiveDonorRow } from "./donor-repository";
import { FundingChart } from "./funding-chart";

export function LiveDonorDirectory({ initialDonors }: { initialDonors: LiveDonorRow[] }) {
  const [search, setSearch] = useState("");

  const filtered = search.trim()
    ? initialDonors.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()))
    : initialDonors;

  if (initialDonors.length === 0) {
    return (
      <div>
        <p>No donor relationships are available to your account. Register a donor above; Staff / Board members can also ask an Admin to assign a relationship.</p>
      </div>
    );
  }

  return (
    <>
      <div className="filters">
        <input
          type="search"
          aria-label="Search donors"
          placeholder="Search by name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span role="status" aria-live="polite">{filtered.length} donor{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="table-scroll">
        <table>
          <caption>Live donor data</caption>
          <thead>
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Type</th>
              <th scope="col">Email</th>
              <th scope="col">Total giving</th>
              <th scope="col">Sources</th>
              <th scope="col">Board owner</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((d) => (
              <tr key={d.id}>
                <td><Link href={`/donors/${d.id}`}>{d.name}</Link></td>
                <td>{d.kind}</td>
                <td>{d.email ?? "—"}</td>
                <td>{d.totalCents > 0 ? formatMoney(d.totalCents) : "—"}</td>
                <td>{d.sources.join(", ") || "—"}</td>
                <td>{d.ownerName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <FundingChart gifts={filtered.flatMap(d=>d.funding)} scope="Visible donor relationships"/>
    </>
  );
}
