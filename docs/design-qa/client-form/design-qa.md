# Add New Client reference replication — Design QA

- Source visual truth: `/var/folders/kc/qkfc5w4n2wn7rk2g9cx1_w880000gn/T/codex-clipboard-f794b857-73df-4040-8f2e-ce800702404f.png`
- Implementation screenshot: `/Users/queeni/Documents/ChatGPT/YB Travel/yb-travel-platform/docs/design-qa/client-form/implementation-1343x753.png`
- Same-input comparison: `/Users/queeni/Documents/ChatGPT/YB Travel/yb-travel-platform/docs/design-qa/client-form/comparison.png`
- Route: `http://localhost:5173/clients?newClient=true`
- State: authenticated System Administrator; New Client panel open; sample name entered; Household selected; Standard fee group selected from live configured data.
- Reference pixels: 1345 × 785.
- Raw implementation pixels: 2360 × 1339. Chrome reported a 1791 × 1004 CSS viewport at `devicePixelRatio: 0.75` with the existing 1.33333 operator-zoom compensation. The unused browser backing-canvas area was cropped to the measured viewport, padded to the reference aspect, and normalized to 1345 × 785 before comparison.

## Findings

No actionable P0, P1, or P2 differences remain for the supplied Add New Client reference.

- Fonts and typography: the page follows the product's approved Lato design-system font rather than the mock file's Helvetica fallback. Weight, hierarchy, compact 10–14px labels, tracked uppercase section headings, button labels, and help-copy wrapping visibly match the reference intent.
- Spacing and layout rhythm: compact 34px / 30px / 30px page chrome, 16px page inset, 22px identity tile, three-column form grid, 300px guidance rail, green top rule, square borders, aligned horizontal labels, and three-button footer match after viewport normalization.
- Colors and visual tokens: dark green chrome and selected state, warm grey canvas, white work areas, gold identity mark, muted borders, green links, and pale footer/sidebar surfaces use the existing YB Travel tokens and align with the reference.
- Image quality and asset fidelity: the target contains no photographic, illustrated, or generated imagery. The existing text logo and gold identity marks remain sharp; no visible raster asset was approximated.
- Copy and content: all reference-specific fixed copy is present, including the name-first guidance, client-type explanation, assignment help, What Happens Next rail, duplicate-name note, and keyboard hint. The live configured Standard fee group appears instead of the reference's no-active-fee-groups placeholder, which is the correct data-driven alternate state defined by the supplied design.
- Accessibility and states: the name field is labelled and focused on open; client-type buttons expose `aria-pressed`; empty-name state disables both create actions; Company/Household selection works; Escape, Cancel, and close return to `/clients`; selects remain keyboard accessible. Create actions were not submitted during QA to avoid creating test client records.
- Console: no application-origin console errors were found. The only errors came from installed wallet extensions attempting to inject `ethereum`; they are unrelated to YB Travel.

## Focused comparison evidence

The combined comparison is legible enough to verify the dense page chrome, two form sections, field alignment, client-type segmented control, guidance rail, footer actions, and table header in one view. No separate focused crop was needed.

## Comparison history

- Initial normalized comparison: no P0/P1/P2 layout, typography, palette, or copy mismatch remained. The live capture initially showed Company selected because that control had just been interaction-tested.
- State normalization: returned the segmented control to the reference's default Household state and captured again. This was comparison-state alignment, not a visual code fix.
- Final comparison: the reference and implementation align in page density, form proportions, section hierarchy, guidance rail, footer, and surrounding Clients table. The visible active-fee selector is an expected live-data state rather than design drift.

## Implementation checklist

- [x] Match compact page chrome and Clients header proportions.
- [x] Match the two-section, three-column form layout.
- [x] Add the interactive Household / Company / Individual selector.
- [x] Preserve real representative and fee-group data.
- [x] Preserve the hidden WhatsApp prefill in create requests.
- [x] Add What Happens Next guidance and inline help.
- [x] Add Cancel, Create & New, and Create Client footer actions.
- [x] Verify empty-name, client-type, Escape, and Cancel states.
- [x] Pass the web TypeScript check immediately after the client-form edits, the production build with the required modern Node runtime, and `git diff --check`. A later final rerun is currently stopped by an unrelated concurrent type error in `travellers.tsx:239`.

## Follow-up polish

No P3 visual follow-ups are required for this reference.

final result: passed
