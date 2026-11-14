# CIC workspace visual specification

`overview-concept.png` was generated with the built-in Image Gen tool for the complete primary desktop screen, then selected as the foundation reference. It is a design reference only; no bitmap screenshot is shipped as interactive UI. The exact concept brief requested a white/dark-green sidebar workspace with overview, four metrics, task rows, evidence path and recent activity. No photos, invented CIC logo, hero badges, gradients or external product claims.

## System extracted before implementation

- Canvas: true white `#FFFFFF`; headings/selected controls `#007A3D`; accent token `#00A850`; panel/selection `#E6F4ED`; body black; supporting text `#595959`. Light gray is used for rules, not low-contrast body text.
- Arial/Helvetica sans; body 16px/1.5, UI navigation 22px desktop, headings responsive 28–48px, section headings 23–34px. No remote font fetch.
- A 255px desktop rail at the concept's 1536px native width, 46px content gutters, open metric strip with vertical rules, 1.65:1 main columns, simple divider rows. No card grid, shadows, decorative backgrounds or icons.
- Components: wordmark text (project name, not CIC's logo), selected nav link, outlined 48px button, page heading, metric strip, task row with initials, simple activity list and pale evidence panel.
- Other routes extend this same system; functional necessities include labeled search/select, semantic table, plain feature handoff notice and error/empty states.
- Mobile: rail becomes a wrapping top navigation; metrics become 2×2; columns stack; tables scroll within their own wrapper. No page-wide horizontal overflow.

Allowed overview copy is the concept's navigation, heading/subheading, View donors/View all, task and activity labels, and evidence/quarterly-care text. One intentional correction: concept label “Next steps due” becomes **“Open next steps”**, because three seeded tasks are future-dated. Metrics derive from fixtures. This avoids a misleading due count.

Functional necessities outside the primary concept: linked donor names, fictional-data notice on every route, foundation notices on incomplete workflows, setup/error/loading/not-found states and readable table captions. These are intentional extensions, not claims of completed live behavior.

## Reference comparison and browser checks

Compared the selected concept and latest Playwright screenshots using `view_image` at the concept's native **1536×1024 viewport**, plus **390×844** mobile. Full-page capture can extend below the viewport. Browser/IAB discovery returned “No browser is available” and an empty browser list, so the frontend workflow's Playwright fallback used installed Chrome.

| Comparison | Observed result / action |
| --- | --- |
| Layout | Preserved white rail, open four-metric strip, 1.65:1 task/evidence columns and activity list. Corrected rail/gutters to 255px/46px after first comparison. |
| Copy | Overview copy matches the brief/reference, with the documented accurate “Open next steps” replacement. No invented hero badges or external claims. |
| Typography | Increased desktop heading, navigation and task sizes after comparison. Browser Arial is the approved brand font; raster concept glyphs are not treated as a separate proprietary font. |
| Palette | White canvas, dark-green text, pale-green panel, black body; no gradients, tints over assets or large primary-green backgrounds. |
| Rows/containers | Kept simple rules, initial circles and one evidence panel. Reduced task padding to align the reference's vertical rhythm. No nested card grid. |
| Assets/icons | All interface text is HTML. Text wordmark is Hackleaf, not a replacement CIC logo. A plain H favicon fixes a missing-resource request. |
| Mobile | Navigation wraps, metrics use 2×2, columns stack, donor table scrolls inside its wrapper; no page-wide overflow at 390px. |

The implementation was visually checked against this selected reference for the foundation surface. Intentional differences are explicit above; the screenshot is not a claim that P0 workflows are complete.

Functional verification passed: overview/title, donor search and owner filter, empty search, profile timeline, four feature routes, sample CSV, health API, unauthorized reporting, not-found state, mobile search/overflow and keyboard skip link. Final browser run had no page/console errors. Lighthouse overview accessibility: **100/100**; this is one page's automated result, not a whole-product certification.

Separate checks: production build, lint, TypeScript, 18 domain/database tests; live setup-mode response excludes fixture names; missing API key gets 401 and valid key gets explicit 503 until reporting connects. No live Supabase/provider/account flow was tested because none is provisioned.
