import { funding, frequencies, programs, sources, type DonationRequest } from "./requests";
import type { Allocation } from "./allocation";

function cell(value: string | number) {
  let text = String(value);
  // Prevent request text from becoming an Excel/Sheets formula on import.
  if (/^[\s\uFEFF]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function requestsCsv(requests: readonly DonationRequest[], allocations: readonly Allocation[], options = { label: "Fictional demo", programs: programs as readonly { id: string; name: string }[] }) {
  const rows: (string | number)[][] = [["Workspace", "Request ID", "Donation title", "Priority", "Program", "Currency", "Amount required", "Amount raised", "Amount remaining", "Percent funded", "Status", "Frequency", "Preferred giving channel", "Description"]];
  for (const request of [...requests].sort((a, b) => a.priority - b.priority)) {
    const data = funding(request, allocations);
    rows.push([options.label, request.id, request.campaign, request.priority,
      options.programs.find((program) => program.id === request.program_id)?.name ?? request.program_id, request.currency,
      (request.goalCents / 100).toFixed(2), (data.raisedCents / 100).toFixed(2), (data.remainingCents / 100).toFixed(2),
      data.percent, data.status, frequencies[request.frequency], sources.find((source) => source.value === request.source)?.label ?? request.source, request.note]);
  }
  return `\uFEFF${rows.map((row) => row.map(cell).join(",")).join("\r\n")}\r\n`;
}

export function downloadRequestsSpreadsheet(requests: readonly DonationRequest[], allocations: readonly Allocation[]) {
  const url = URL.createObjectURL(new Blob([requestsCsv(requests, allocations)], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url; anchor.download = "donation-requests-demo.csv"; anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
