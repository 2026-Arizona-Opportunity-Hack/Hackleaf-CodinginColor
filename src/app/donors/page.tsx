import { PageHeading } from "@/components/page-heading";
import { DonorDirectory } from "@/features/donors/donor-directory";
import { isDemoWorkspace } from "@/lib/workspace";
export default function DonorsPage() { if (!isDemoWorkspace()) return null; return <><PageHeading title="Every donor belongs here." description="One place for giving history, ownership, and the next conversation." /><DonorDirectory /></>; }
