"use client";

export default function ErrorBoundary({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <section className="setup-state"><h1>We couldn’t load this view.</h1><p>Please try again. No changes were submitted by this page.</p><button className="button" onClick={reset}>Try again</button></section>;
}
