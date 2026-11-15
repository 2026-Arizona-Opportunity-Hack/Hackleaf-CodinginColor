// Next runs this synchronous module before React hydration. Some browser
// extensions annotate server HTML, including Next's own metadata boundaries.
// Remove only the two reported inert markers, once. Keep application attributes,
// content and React's hydration diagnostics intact; don't fight extensions with
// a persistent observer or turn off server rendering.
document.querySelectorAll("[bis_skin_checked]").forEach((element) => {
  element.removeAttribute("bis_skin_checked");
});

if (document.body) {
  const processedMarker = /^__processed_[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}__$/i;
  for (const name of document.body.getAttributeNames()) {
    if (processedMarker.test(name)) document.body.removeAttribute(name);
  }
}

export {};
