import { FoundationNotice, PageHeading } from "@/components/page-heading";

export function ReportWorkspace() {
  return <><PageHeading title="A renewal starts with evidence." description="Bring a funder’s giving history and supported program outcomes into one packet." />
    <FoundationNotice>Gift history is modeled. Verified program outcomes and funder attribution have not been supplied. Packet generation is not implemented; no impact numbers are invented.</FoundationNotice>
    <h2>Every packet needs</h2><ul className="simple-list"><li>Funder, reporting period, gifts, source provenance and program designation.</li><li>Aggregate outcomes with metric, date window, source and verification time.</li><li>Clear attribution wording and an explicit missing-evidence section.</li><li>A human review before sharing the renewal application.</li></ul>
    <p>Aditya owns packet assembly and export. Kaustubh owns the authenticated aggregate reporting API and coordination with the curriculum team.</p>
  </>;
}
