import Link from "next/link";
import { FoundationNotice, PageHeading } from "@/components/page-heading";
import { demoDonors, demoGifts } from "@/lib/demo/data";
import { formatMoney } from "@/lib/domain/rules";

function grantHistoryByDonor() {
  return demoDonors
    .map((donor) => {
      const gifts = demoGifts.filter((g) => g.donorId === donor.id);
      const byYear: Record<number, number> = {};
      for (const g of gifts) {
        const year = Number(g.receivedOn.slice(0, 4));
        byYear[year] = (byYear[year] ?? 0) + g.amountCents;
      }
      return { donor, byYear, total: gifts.reduce((s, g) => s + g.amountCents, 0) };
    })
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total);
}

function fundingByProgram() {
  const totals: Record<string, number> = {};
  for (const g of demoGifts) {
    totals[g.programId] = (totals[g.programId] ?? 0) + g.amountCents;
  }
  return Object.entries(totals).sort((a, b) => b[1] - a[1]);
}

const YEARS = [2025, 2026];

export function ReportWorkspace() {
  const history = grantHistoryByDonor();
  const programs = fundingByProgram();

  return (
    <>
      <PageHeading
        title="A renewal starts with evidence."
        description="Giving history and program funding in one place — ready to build a packet."
      />

      <FoundationNotice>
        Fictional giving data only. Verified program outcomes and funder attribution have not been supplied.
        Packet export is not implemented; no impact numbers are invented.
      </FoundationNotice>

      <section>
        <h2>Funding by program</h2>
        <div className="table-scroll">
          <table>
            <caption>Fictional USD totals across all years · for grant renewal context</caption>
            <thead>
              <tr>
                <th scope="col">Program</th>
                <th scope="col">Total raised</th>
              </tr>
            </thead>
            <tbody>
              {programs.map(([programId, cents]) => (
                <tr key={programId}>
                  <td>{programId}</td>
                  <td>{formatMoney(cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>Grant history by donor</h2>
        <p>Year-over-year giving per funder — the foundation for a renewal packet.</p>
        <div className="table-scroll">
          <table>
            <caption>Fictional USD giving · all recorded years</caption>
            <thead>
              <tr>
                <th scope="col">Donor</th>
                <th scope="col">Kind</th>
                {YEARS.map((y) => <th key={y} scope="col">{y}</th>)}
                <th scope="col">Total</th>
              </tr>
            </thead>
            <tbody>
              {history.map(({ donor, byYear, total }) => (
                <tr key={donor.id}>
                  <td><Link href={`/donors/${donor.id}`}>{donor.name}</Link></td>
                  <td>{donor.kind}</td>
                  {YEARS.map((y) => (
                    <td key={y}>{byYear[y] ? formatMoney(byYear[y]) : "—"}</td>
                  ))}
                  <td><strong>{formatMoney(total)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2>What a renewal packet needs</h2>
        <ul className="simple-list">
          <li>Funder name, reporting period, gifts with source provenance and program designation.</li>
          <li>Aggregate outcomes with metric, date window, source URL and verification time.</li>
          <li>Clear attribution wording and an explicit missing-evidence section.</li>
          <li>Human review before sharing with the funder.</li>
        </ul>
        <p><small>Packet export and outcome evidence require the authenticated aggregate API (Kaustubh) and the Problem 1 outcomes integration (Aditya).</small></p>
      </section>
    </>
  );
}
