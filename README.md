# Cutting QR Code Generator

> **One-line summary:** Bulk-generates A4 print-ready cut-ticket QR cards from a CSV of orders, enriched with fabric/style metadata, so the cutting and store teams can scan-track every order on the floor.

---

## Who Is This For?

| Audience   | How They Use It                                                                                 |
| ---------- | ----------------------------------------------------------------------------------------------- |
| Operations | Upload the daily order CSV, generate QR cut-tickets, and print them in A4 sheets for dispatch. |
| Store      | Scan QR codes to look up orders, verify fabric / accessory / wash-care details before issue.    |
| Engineers  | Maintain the React app, the nginx Docker image, and the deploy workflow.                        |

---

## Where to Access

| Environment | URL                                              |
| ----------- | ------------------------------------------------ |
| Production  | `https://cutting-qrcode.qurvii.com`              |
| Staging     | `https://staging-cutting-qrcode.qurvii.com`      |

**Auth:** Currently open-access on the internal network — no login. Anyone with the URL can upload a CSV and print. Treat the staging URL as the safe place to experiment.

---

## Core Workflows

1. **Upload order CSV** — Operations downloads the template (`Download Template` button on the home page), fills it with the day's orders (Order ID, Style Number, Size, Brand, Color, Wash Care, etc.), drag-drops or selects the file, and confirms parsing succeeded.
2. **Generate & print QR cards** — On the QR page, the app fetches the latest fabric/style master data from the raw-material backend and renders 3 cards per A4 row. Click **Print** to send to the printer; cards include order metadata + a QR encoding the Order ID.
3. **Scan on the floor** — Store / cutting team scans the QR with any phone or scanner; the decoded payload is the Order ID which can be looked up in the inventory / order system.

---

## Tech Stack

| Layer    | Technology                                                                                            |
| -------- | ----------------------------------------------------------------------------------------------------- |
| Frontend | React 19 + Vite, React Router, Tailwind CSS 4, PapaParse (CSV), Axios, Lucide icons                   |
| QR       | `api.qrserver.com` (external image API — no rate limits at print volumes)                             |
| Backend  | Read-only consumer of `https://raw-material-backend.onrender.com/api/v1/style-details` (separate repo) |
| Hosting  | Multi-stage Docker → nginx:alpine, pushed to GHCR, deployed via GitHub Actions to Qurvii server       |

---

## Local Development

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build into ./dist
npm run preview  # serve the production build locally
```

The CSV template lives at `public/QrCode.csv` and is served at `/QrCode.csv`.

---

## Gotchas & Things to Know

- **Data sensitivity:** This tool handles internal **order data** (Order IDs, brand, channel, fabric specs, accessories). Do not expose endpoints publicly or share the print PDFs outside the operations / store teams.
- **CSV column names matter:** The QR cards read fields by exact header name (e.g. `(Do not touch) Order Id`, `Style Number`, `Pattern#`, `Wash Care`). Don't rename headers in the template — use the provided template as-is.
- **localStorage persistence:** Uploaded CSV data is cached in the browser via `localStorage` (key: `products`). After upload, the QR page works even on refresh — but switching browsers / devices means re-uploading.
- **Backend dependency:** Fabric averages and widths come from the raw-material backend. If that service is down, cards still print but fabric rows will be empty.
- **QR provider:** Generated via `api.qrserver.com` (free, generous limits). If it ever fails per-card, the broken-image is hidden automatically. Switch provider in `src/services/api.js → buildQrImageUrl`.
- **Print layout is A4-locked:** The grid is `repeat(3, 1fr)` with mm-based gaps and tuned for a 210 mm width. Other paper sizes will look off — change `.qr-cards-grid` in `src/index.css`.
- **SPA routing:** Uses `BrowserRouter`. The Docker image's `nginx.conf` falls back to `index.html` for unknown paths, so direct refresh on `/qr` works in production. Don't remove that fallback.
- **No auth layer:** If we ever expose this externally, add an auth gateway (basic-auth at nginx, or move behind the Qurvii SSO proxy).

---

## Repo / Deploy Notes

- Default branch `main` → production (`https://cutting-qrcode.qurvii.com`)
- Branch `dev` → staging (`https://staging-cutting-qrcode.qurvii.com`)
- Push to either branch triggers `.github/workflows/deploy.yml`: build Docker image → push to GHCR → SSH deploy → smoke test.
- **Rollback (fast):** SSH into server, pull a previous image tag, update `docker-compose.yml`, `docker compose up -d`.
- **Rollback (standard):** `git revert` the bad commit → workflow rebuilds and redeploys automatically.
