# System-wide Inbox style alignment — 8 September 2026

The supplied Inbox and Managed Groups screenshots established the target.
The consistency audit found three font families, duplicate WhatsApp subnav
implementations, and route-specific zoom compensation. These were corrected
in shared tokens and components, not by changing business workflows.

## Rendered checks

1. Managed Groups — consistent header, 44px secondary navigation, 24px title,
   warm canvas and rounded controls/table container. [Screenshot](01-managed-groups.png).
2. Client profile — Instrument Sans, 600-weight title, rounded 14px cards and
   updated form controls confirmed in Chrome. [Screenshot](02-client.png).
3. Requests — shared header and filter strip, unified typography and controls;
   existing dense table layout retained. [Screenshot](03-requests.png).
4. Setup — same title and font, semantic warnings retained. [Screenshot](04-setup.png).
5. Inbox — compared with Managed Groups; shared navigation, typography and
   colors match. Conversation layout remains unchanged. [Screenshot](05-inbox.png).

## Verification and limits

- Web TypeScript and production build passed.
- `node apps/web/scripts/check-design-consistency.mjs` checks every route for
  legacy fonts/zoom, shared title classes, shared WhatsApp tabs and one Sign Out.
- Chrome's computed styles confirmed Instrument Sans, 24px titles and 14px
  client-card radius. Restarted only Vite to clear stale CSS from the preview.
- This was a desktop visual consistency pass, not a complete accessibility or
  all-permission/multi-device workflow test. Existing minimum desktop widths
  and dense table layouts remain. Monospaced technical labels are intentional.
