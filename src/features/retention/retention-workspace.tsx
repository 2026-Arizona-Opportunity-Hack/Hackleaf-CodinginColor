"use client";

import { useAssistantWorkspace } from "@/features/assistant/workspace-context";
import { useState } from "react";
import Link from "next/link";
import { FoundationNotice, PageHeading } from "@/components/page-heading";
import { demoDate, demoDonors, demoGifts } from "@/lib/demo/data";
import { classifyRetention, formatMoney } from "@/lib/domain/rules";

// The fictional workspace stays on its fixture date on both server and client.
const CURRENT_YEAR = Number(demoDate.slice(0, 4));

export function RetentionWorkspace() {
  const workspace=useAssistantWorkspace(),donors=workspace?.relationships.donors??demoDonors;
  const donorGiving=(id:string,year:number)=>(workspace?.relationships.gifts??demoGifts).filter(g=>g.donorId===id&&g.receivedOn.startsWith(String(year))).reduce((sum,g)=>sum+g.amountCents,0);
  const [prevYear, setPrevYear] = useState(CURRENT_YEAR - 1);
  const [currYear, setCurrYear] = useState(CURRENT_YEAR);

  const rangeError = currYear <= prevYear ? "Current period must be after previous period." : null;

  return (
    <>
      <PageHeading
        title="See the people behind the totals."
        description="Find new, growing, steady, and lapsed donor relationships."
      />
      <FoundationNotice>
        Fictional fixture data only. CIC&apos;s fiscal-year start month, refund and lapse
        thresholds still need confirmation before live use.
        Live Supabase period filtering is not yet connected.
      </FoundationNotice>

      <section>
        <h2>Comparison periods</h2>
        <form className="filters" onSubmit={(e) => e.preventDefault()}>
          <label>
            Previous year
            <input
              type="number"
              min={2020}
              max={CURRENT_YEAR}
              value={prevYear}
              onChange={(e) => setPrevYear(Number(e.target.value))}
            />
          </label>
          <label>
            Current year
            <input
              type="number"
              min={2020}
              max={CURRENT_YEAR + 1}
              value={currYear}
              onChange={(e) => setCurrYear(Number(e.target.value))}
            />
          </label>
        </form>
        {rangeError && <p role="alert">{rangeError}</p>}
      </section>

      {!rangeError && (
        <div className="table-scroll">
          <table>
            <caption>
              Fictional USD giving · Jan 1 – Nov 14 · {prevYear} vs {currYear}
            </caption>
            <thead>
              <tr>
                <th scope="col">Donor</th>
                <th scope="col">{prevYear} YTD</th>
                <th scope="col">{currYear} YTD</th>
                <th scope="col">Relationship</th>
              </tr>
            </thead>
            <tbody>
              {donors.map((d) => {
                const previous = donorGiving(d.id, prevYear);
                const current = donorGiving(d.id, currYear);
                return (
                  <tr key={d.id}>
                    <td><Link href={`/donors/${d.id}`}>{d.name}</Link></td>
                    <td>{formatMoney(previous)}</td>
                    <td>{formatMoney(current)}</td>
                    <td>{classifyRetention(previous, current)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
