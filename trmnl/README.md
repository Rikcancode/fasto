# Fasto on TRMNL

Shows Fasto on a TRMNL e-ink display (built for TRMNL X, 1872×1404, 16 grays; also works on the OG).

There are two ways to drive the display:

- **TRMNL cloud** (needs the paid Developer Edition add-on): Fasto pushes to a Webhook private plugin. See *Setup (TRMNL cloud)*.
- **Self-hosted, free (BYOS)**: the TRMNL X talks to [LaraPaper](https://github.com/usetrmnl/byos_laravel) on your own server, which polls Fasto over the LAN. See *Setup (self-hosted LaraPaper)*.

## Setup (self-hosted LaraPaper)

1. In Fasto's settings add `TRMNL_POLL_TOKEN` (generate one with `openssl rand -hex 16`) and `TZ`. Restart Fasto.
2. Install LaraPaper: ZimaOS → App Store → Custom Install, paste [larapaper-compose.yml](larapaper-compose.yml), and replace `APP_KEY` first.
3. Open `http://<server>:4567`, create your account, then go to **Plugins → Import** and upload [fasto-larapaper.zip](fasto-larapaper.zip). In the plugin's settings, set **Fasto URL** and **Fasto poll token**.
4. In LaraPaper's header, turn on **Permit Auto-Join**.
5. On the TRMNL X, hold the button on the back for 5 seconds to open the setup portal. Join its Wi-Fi from your phone, enter your Wi-Fi details, and set the server URL to `http://<server>:4567`. Needs firmware 1.4.6 or newer.
6. The device appears in LaraPaper's device list. Add the Fasto plugin to its playlist, then turn Auto-Join off again.

The device then only shows what LaraPaper serves; TRMNL cloud plugins stop unless you add equivalents in LaraPaper. After changing a template, run `./build-larapaper-zip.sh` and re-import.

## What the screen shows

- Current 7-day average, a strip of chevrons (one per kg between the programme start and the goal, filled as they're lost) and the goal weight. Below it, how far ahead of or behind the plan line you are.
- Body fat and weeks to go, then a progress bar from start to goal with a tick per milestone and a marker for where the plan says you should be today.
- A table from the programme start to the goal: plan for today, the gap to the next milestone, the next milestone and the goal.
- Two charts covering the whole plan, weight and body fat: the dashed plan line through every milestone, the weigh-ins so far, and a "Today" marker.
- A "Time to set new goals" box once the goal weight is reached, the goal date has passed, or no goal is set.
- Numbers are set in Zen Dots and text in DM Sans, loaded from Google Fonts, so the renderer needs internet access.
- The logo in the title bar is `logo.png` (the app icon cut out of its background, in greys), embedded in `shared.liquid` as base64 inside an SVG so the TRMNL framework doesn't dither it.

## How it works (TRMNL cloud)

Fasto runs on the LAN, so TRMNL's cloud can't poll it. Fasto **pushes** instead: every `TRMNL_PUSH_MINUTES` (default 30) it builds a summary of about 1.5 KB and POSTs it to a TRMNL **Webhook** private plugin. TRMNL renders it with the Liquid templates in this folder.

- If the data hasn't changed since the last push, nothing is sent, so the display only refreshes when there's a new weigh-in or the day changes.
- TRMNL's limits are 12 pushes an hour and a 5 KB payload on the standard plan. The interval can't go below 5 minutes.

## Setup (TRMNL cloud)

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
- `weight.startDate`: the programme's start date
- `chart`: the last 60 days — `actual` and `plan` (SVG polyline points in a 1000×300 box), `min`, `max`, `from`, `to`
- `planChart.weight` and `planChart.fat`: the whole plan period — `plan`, `actual`, `lastX`/`lastY`, `todayX`, `milestones[]` (`x`, `y`, `v`, `d`), `goal`, `goalX`/`goalY`, `min`, `max`, `from`, `to`
- `training`: `title`, `day`, `session`, `kcal`, `protein`, `checkpoint.name`, `checkpoint.date`, `checkpoint.daysLeft`, `checkpoint.items[]`

The numbers use the same rules as the dashboard cards in `public/app.js`.
