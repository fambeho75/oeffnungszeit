# Öffnungszeit

See if a short list of Skövde shops is open right now, and what today’s hours are. Tap a place for the week and any holiday exceptions.

It is a static site: no account, no server, no Google Places API. The shared list lives in `places.json`. Every phone shows those hours.

Open or closed is computed in the browser for **Europe/Stockholm**. A span runs from its open time up to, but not including, its close.

## Run it locally

From this folder:

```bash
python3 -m http.server 8765
```

Open http://127.0.0.1:8765/

Do not open the files with `file://`. The place list is fetched, and the service worker will not register.

Check the hours math with:

```bash
node test/hours.test.js
```

## On an iPhone

1. Publish the site over HTTPS (GitHub Pages is enough).
2. Open that exact URL in Safari.
3. Share → **Add to Home Screen**.

The list is the same on every phone. It comes from `places.json` for this site.

## GitHub Pages

1. Push this folder to the repository root (or keep the same paths if you use a subfolder).
2. In the repo: **Settings → Pages → Build and deployment → Deploy from a branch**.
3. Branch `main`, folder `/ (root)`, then save.
4. The site will be `https://fambeho75.github.io/oeffnungszeit/`.

`.nojekyll` is included so GitHub Pages serves `places.json` as a file. Paths are relative, so a project site (`/<repo>/`) works without a custom domain.

After it is live, keep using that HTTPS URL. Add to Home Screen from there.

## What’s in the list

Shipped on 19 Oct 2026. Re-check the pages below when seasons change. Weekly hours are ordinary days. `exceptions` cover dated holidays.

| Place | Ordinary hours | Source |
| --- | --- | --- |
| Risängen, Komponentvägen, 541 34 Skövde | Mon & Thu 07:00–19:00, Tue/Wed/Fri 07:00–16:30, Sat 08:30–14:00, Sun closed | [avfallskaraborg.se](https://avfallskaraborg.se/atervinningscentraler/risangen-skovde/) |
| Coop Vipans Gränd | Every day 06:00–23:00 | Supplied hours. [Store page](https://www.coop.se/butiker-erbjudanden/coop/coop-vipans-grand-skovde/) |
| Stora Coop Nolhaga | Every day 07:00–22:00 | Supplied hours. [Store page](https://www.coop.se/butiker-erbjudanden/stora-coop/stora-coop-nolhaga-skovde/) |
| ICA Maxi Skövde, Köpmannagatan 3 | Every day 07:00–22:00 | [ica.se](https://www.ica.se/butiker/maxi/skovde/). Store hours, not the deli counter. |
| Lidl Skövde, Gesällgatan 3, 541 50 Skövde | Mon–Fri 08:00–21:00, Sat 08:00–20:00, Sun 09:00–20:00 | Provisional. [lidl.se](https://www.lidl.se/s/sv-SE/butiker/skoevde/gesaellgatan-3/) lists Mon–Fri 08:00–19:00 only. Weekends, and the later weekday close, are from other listings. |
| Willys Skövde, Jonstorpsgatan 25, 541 66 Skövde | Every day 08:00–21:00 | [willys.se](https://www.willys.se/butik/skovde/willys-stallsiken-2270) store 2270. Special dates: Alla helgons afton and Alla helgons dag 08:00–21:00, Julafton 08:00–14:00, Juldagen and Annandag jul 08:00–21:00, Nyårsafton 08:00–19:00, Nyårsdagen 09:00–21:00, Trettondagen 08:00–21:00. |
| Biltema Skövde, Norra Metallvägen 4, 549 37 Skövde | Mon–Fri 07:00–20:00, Sat–Sun 09:00–18:00 | [biltema.se](https://www.biltema.se/varuhus-och-oppettider/skovde/) |
| Swedbank Skövde, Storgatan 15, 541 30 Skövde | Mon–Wed 13:00–16:00, Thu 13:00–17:00, Fri 13:00–15:00, weekends closed | [swedbank.se](https://www.swedbank.se/om-oss/kontakta-oss/kontor/skovde.html) branch record. The page’s holiday table is Stängt; those dates are exceptions for the rest of 2026 and all of 2027. |
| Systembolaget Skövde, Hertig Johans Torg 4, 541 30 Skövde | Mon–Thu 10:00–18:00, Fri 10:00–19:00, Sat 10:00–15:00, Sun closed | [systembolaget.se](https://www.systembolaget.se/butiker-ombud/butik/vastra-gotalands-lan/skovde/hertig-johans-torg-4-1606/) store 1606. Red days, midsommarafton and julafton closed. Påskafton and nyårsafton 10:00–15:00. 22–23 and 29–30 Dec, and the Thursday before midsommar, open until 19:00. |

Risängen’s page says the centre is closed on public holidays and most eves, and open as usual on Trettondagsafton and Valborg. Those dates are written out in `exceptions` through 6 Jan 2028. Biltema’s Christmas hours from the same page are dated for the 2026 and 2027 seasons (Julafton closed, Juldagen and Annandag jul 09:00–18:00, Nyårsafton 09:00–15:00, Nyårsdagen closed, Trettondedag jul 09:00–18:00).

Coop and ICA have no holiday rows yet. Add them when the official page, or a visit, gives a date and a time.

Skövde’s other Systembolaget, Nolhagavägen 1, 549 38, is not in the list. Its ordinary hours on the same date were Mon–Fri 10:00–19:00, Sat 10:00–15:00, Sun closed.

The footer says **Hours updated** plus the `updated` date from `places.json`.

## On a place

The screen shows the place name, whether it is open or closed, the weekly hours, and any upcoming dates that differ. Addresses, sources, and map links stay in `places.json` and are not shown.

Tap + Add place, type the name and submit the issue; the hours get looked up and added to `places.json`.

## Update the shared list

Edit `places.json`, set `updated` to the day you checked, and push. Phones pick up the new hours on the next online open. `places.json` is requested from the network first and cached for offline use.

You do not need to bump the service worker for a JSON-only change. When `index.html`, `styles.css`, `app.js`, or `hours.js` changes, bump `CACHE` in `sw.js` (and the `?v=` on those files) so installed copies drop the old shell.

### Shape

```json
{
  "updated": "2026-10-19",
  "timezone": "Europe/Stockholm",
  "places": [
    {
      "id": "soptippen",
      "name": "Soptippen",
      "address": "Risängen, Komponentvägen, Skövde",
      "website": "https://example.com/hours",
      "source": "avfallskaraborg.se",
      "checked": "2026-10-19",
      "provisional": false,
      "note": "Shown on the detail screen.",
      "hours": {
        "mon": [{ "open": "07:00", "close": "19:00" }],
        "sat": [{ "open": "08:30", "close": "14:00" }],
        "sun": "closed"
      },
      "exceptions": [
        { "date": "2026-12-24", "hours": "closed", "label": "Julafton" },
        { "date": "2026-12-25", "hours": [{ "open": "09:00", "close": "18:00" }], "label": "Juldagen" },
        { "start": "2026-12-24", "end": "2026-12-26", "hours": "closed", "label": "Jul" }
      ]
    }
  ]
}
```

Week keys are `mon` … `sun`. A day is a list of `{open, close}`, `"closed"`, or `"unknown"`. Unknown days show **Unknown** instead of a guessed Closed.

An exception is one `date` or a `start`/`end` range (inclusive, `YYYY-MM-DD`). A single date wins over a range that covers the same day. Use `"hours": "closed"` or a span list.

Older copies stored phone edits in `localStorage` under `hours-pin-v1`. The app ignores that data and clears the key once on load.

## Files

- `index.html` — page shell
- `styles.css` — flat orange `#ff6a00` on black
- `app.js` — screens
- `hours.js` — Stockholm open/closed math
- `places.json` — shared places, weekly hours, exceptions
- `sw.js` — offline cache (`oeffnungszeit-v9`)
- `manifest.webmanifest` — installable PWA
- `icon.svg`, `favicon-32.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png`, maskable PNG icons — original clock mark
- `test/hours.test.js` — open/closed cases, including holidays and DST

## Routine for the next refresh

1. Open each `website` in the table and note ordinary hours plus any new holiday or seasonal times.
2. Edit that place in `places.json`. Add or replace `exceptions` for the coming Christmas and red days. Drop dates that are past if the file is getting long; the app only lists exceptions from today forward.
3. For Risängen, keep the published rule: closed on helgdagar and aftnar, ordinary hours on Trettondagsafton and Valborg, unless the page changes. The place id stays `soptippen`.
4. Set `updated` to today’s date.
5. Push. Installed phones show the new footer date after they next open the app online.
