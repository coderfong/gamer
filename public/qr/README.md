# QR placement images

Drop generated images here to replace the colored mock cards on
`/how-it-works` → **QR placements** tab. Each card renders its photo when the
matching file exists; if a file is missing, the card falls back to the colored
mock automatically (no code change needed).

Expected files (4:3 landscape, e.g. 1536×1024, `.png` or swap the extension in
`components/site/HowItWorksTabs.tsx`):

| Card                  | File                  |
| --------------------- | --------------------- |
| Product packaging     | `packaging.png`       |
| In-store              | `in-store.png`        |
| Billboards & transit  | `billboards.png`      |
| TV & streaming        | `tv-streaming.png`    |
| Receipts              | `receipts.png`        |
| Event booths          | `event-booths.png`    |
| Social & influencer   | `social.png`          |
| Anywhere else         | `anywhere.png`        |
