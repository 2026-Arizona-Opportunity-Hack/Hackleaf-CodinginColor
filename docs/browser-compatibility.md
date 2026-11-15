# Browser extensions and hydration

The reported `bis_skin_checked="1"` attributes appeared across application divs
and Next.js metadata boundaries. A second report contained a
`__processed_<UUID>__` body attribute. Neither marker is emitted by Hackleaf.
Extensions that annotate HTML before React starts can cause hydration warnings.

`src/instrumentation-client.ts` runs synchronously before hydration, using
[Next.js's client instrumentation convention](https://nextjs.org/docs/app/api-reference/file-conventions/instrumentation-client).
It removes exactly `bis_skin_checked` across the initial document and body
attribute names matching the reported processed-UUID pattern. It runs once,
without a persistent observer, dependencies, or changes to application content,
form values, accessibility attributes or event handlers. Server rendering and
React's normal hydration diagnostics remain enabled, including on body.

The previous body-only `suppressHydrationWarning` workaround has been removed.
An intentional unrelated attribute mismatch in the development browser tests
confirms that real diagnostics still surface. The retention demo also derives
its year from `demoDate`, so a different browser year cannot alter its initial
fixture comparison.

If an extension repeatedly changes HTML after startup or injects other markers,
exclude the local/deployed Hackleaf site in that extension, then reload. A clean
browser profile with extensions disabled can help identify the responsible
extension. The application cannot prevent arbitrary third-party DOM changes.

Run `npm run check` and `npm run test:assistant:browser` for normal verification.
Also run `PLAYWRIGHT_DEV=true npx playwright test --config=playwright.assistant.config.ts`
with other dev servers stopped to exercise hydration diagnostics. The tests
inject the reported markers before application scripts load, check all 14 demo
routes, use a browser clock in 2030, and verify assistant interactions. Model
responses are intercepted only in tests, so this verification uses no API credits.
