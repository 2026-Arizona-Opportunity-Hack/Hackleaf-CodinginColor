import Link from "next/link";
import { FoundationNotice, PageHeading } from "@/components/page-heading";
import { demoDonors, donorGiving } from "@/lib/demo/data";
import { classifyRetention, formatMoney } from "@/lib/domain/rules";

export function RetentionWorkspace() {
  return <><PageHeading title="See the people behind the totals." description="Find new, growing, steady, and lapsed donor relationships." />
    <FoundationNotice>Illustrative January 1–November 14 comparisons in 2025 and 2026. All fixture gifts fall within those windows. CIC’s fiscal-year, refund and lapse definitions still need confirmation; live period filtering is not connected.</FoundationNotice>
    <div className="table-scroll"><table><caption>Fictional USD giving · equivalent year-to-date windows</caption><thead><tr><th scope="col">Donor</th><th scope="col">2025 YTD</th><th scope="col">2026 YTD</th><th scope="col">Relationship</th></tr></thead><tbody>{demoDonors.map((d) => {
      const previous = donorGiving(d.id, 2025), current = donorGiving(d.id, 2026);
      return <tr key={d.id}><td><Link href={`/donors/${d.id}`}>{d.name}</Link></td><td>{formatMoney(previous)}</td><td>{formatMoney(current)}</td><td>{classifyRetention(previous, current)}</td></tr>;
    })}</tbody></table></div>
  </>;
}
