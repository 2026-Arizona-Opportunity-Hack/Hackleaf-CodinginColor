import { FoundationNotice, PageHeading } from "@/components/page-heading";

export function ImportWorkspace() {
  return <><PageHeading title="One donor record. Every source." description="Bring existing gifts together without losing where they came from." />
    <FoundationNotice>CSV parsing, field mapping, dedupe review and transactional commit belong to Vishnu’s workstream. These fixtures define our normalized format; they do not claim to match real Zeffy or Benevity exports.</FoundationNotice>
    <h2>Start with safe sample files</h2><ul className="simple-list">{["spreadsheet", "zeffy", "benevity"].map((source) => <li key={source}><a href={`/samples/${source}.csv`} download>Download fictional {source} CSV</a></li>)}</ul>
    <h2>The import contract</h2><ol className="simple-list"><li>Map source columns and validate dates, cents and source transaction IDs.</li><li>Preview duplicate candidates. Ambiguous shared addresses require human review.</li><li>Commit once, preserve gift provenance, and assign an eligible board owner atomically.</li></ol>
  </>;
}
