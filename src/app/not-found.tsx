import Link from "next/link";
export default function NotFound() { return <section className="setup-state"><h1>Record not found.</h1><p>This link may be outdated, or the record is unavailable.</p><Link href="/donors" className="button">Back to donors</Link></section>; }
