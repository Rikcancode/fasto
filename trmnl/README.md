# Fasto on TRMNL

Shows Fasto on a TRMNL e-ink display (built for TRMNL X, 1872×1404, 16 grays; also works on the OG).

## How it works

Fasto runs on the LAN, so TRMNL's cloud can't poll it. Fasto **pushes** instead: every `TRMNL_PUSH_MINUTES` (default 30) it builds a summary of about 1.5 KB and POSTs it to a TRMNL **Webhook** private plugin. TRMNL renders it with the Liquid templates in this folder.

- If the data hasn't changed since the last push, nothing is sent, so the display only refreshes when there's a new weigh-in or the day changes.
- TRMNL's limits are 12 pushes an hour and a 5 KB payload on the standard plan. The interval can't go below 5 minutes.

## Setup

1. In TRMNL, go to **Plugins → Private Plugin → New**.
   - Name: `Fasto`
   - Strategy: **Webhook**
   - Save. Copy the **Webhook URL** (`https://trmnl.com/api/custom_plugins/<uuid>`).
2. Click **Edit Markup** and paste each file into its tab:

   | File | Tab |
   |---|---|
   | `shared.liquid` | Shared |
   | `full.liquid` | Full |
   | `half_horizontal.liquid` | Half Horizontal |
   | `half_vertical.liquid` | Half Vertical |
   | `quadrant.liquid` | Quadrant |

3. On ZimaOS, add these to Fasto's environment (the `.env` next to the compose file, or the app's settings in the ZimaOS UI):

   ```
   TRMNL_WEBHOOK_URL=https://trmnl.com/api/custom_plugins/<uuid>
   TRMNL_PUSH_MINUTES=30
   TZ=Europe/Rome
   ```

   `TZ` sets which day "Today" is and the time in the "updated" stamp.
4. Restart Fasto. The first push happens 10 seconds after startup. The logs show `TRMNL: pushed N bytes`.
5. Add the plugin to your TRMNL playlist.

## Useful endpoints (behind Fasto's Basic Auth)

- `GET /api/trmnl/payload`: the exact JSON Fasto sends, and its size. Paste `merge_variables` into the markup editor's sample data to preview there.
- `POST /api/trmnl/push`: push now, even if nothing changed.

```bash
curl -u fasto:yourpassword -X POST http://192.168.68.74:3007/api/trmnl/push
```

## Variables available in the templates

`name`, `updated`, then:

- `weight` and `fat`: `last`, `lastDate`, `avg7`, `avgCount`, `plan`, `delta` (e.g. "0.4 kg ahead"), `deltaState` (`ahead` / `behind` / `on-track` / `none`), `toGo`, `next.value`, `next.date`, `target`, `targetDate`, `weeksLeft`, `start`, `progressPct`
- `chart`: `actual` and `plan` (SVG polyline points in a 1000×300 box), `min`, `max`, `from`, `to`
- `training`: `title`, `day`, `session`, `kcal`, `protein`, `checkpoint.name`, `checkpoint.date`, `checkpoint.daysLeft`, `checkpoint.items[]`

The numbers use the same rules as the dashboard cards in `public/app.js`.
