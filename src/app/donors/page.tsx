import { PageHeading } from "@/components/page-heading";
import { DonorDirectory } from "@/features/donors/donor-directory";
import { LiveDonorDirectory } from "@/features/donors/live-donor-directory";
import { isDemoWorkspace } from "@/lib/workspace";
import { fetchLiveDonors } from "@/features/donors/donor-repository";

export default async function DonorsPage() {
  if (isDemoWorkspace()) {
    return (
      <>
        <PageHeading title="Every donor belongs here." description="One place for giving history, ownership, and the next conversation." />
        <DonorDirectory />
      </>
    );
  }
  const donors = await fetchLiveDonors();
  return (
    <>
      <PageHeading title="Every donor belongs here." description="One place for giving history, ownership, and the next conversation." />
      <LiveDonorDirectory initialDonors={donors ?? []} />
    </>
  );
}
