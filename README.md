# Irad League

Official site of the Irad League (*Irad Ligasy*), run by the Football Federation of Irad (*Irad Futbol
Federatsiyasy*, FFI). Part of the Irad ARG; the site itself is fully in-world, this README is not.

Served by GitHub Pages from `main` (root) at **https://mjsbroadbent.github.io/irad-league/** (no custom domain, no
CNAME). Every link and asset path is relative, so the site works under `/irad-league/`. Canonical and Open Graph
URLs and `sitemap.xml` use the full github.io address. `404.html` writes a `<base>` so that it also works when served
at a deeper missing path.

## Structure

No build step. Plain HTML pages with English text inline; `assets/site.js` draws the header, menu and footer,
switches language and renders everything that comes from `data/`.

- Pages: `index.html` (title race, next round, latest results, derby, table, news), `table.html` (full table, form,
  table after any round: `table.html#after-12`), `fixtures.html` (all 27 rounds; `#r26` opens a round, `#club-tulpar`
  lists one club), `clubs.html`, `club-<id>.html` (one per club), `stadiums.html`, `champions.html`, `derby.html`,
  `cup.html`, `first-league.html`, `womens-league.html`, `news.html` (articles anchored by id), `about.html`,
  `404.html`.
- `assets/i18n.js`: `ui` (interface strings in `en`, `ir`, `ru`) and `pages` (Iradi and Russian for every `data-i18n`
  key in the HTML). Long texts sit in the HTML as `<div class="ml">` with `data-l="en"`, `data-l="ru"` and, where
  written, `data-l="ir"` children; where there is no Iradi the English is shown with a note. Iradi is the
  Kyrgyz-based Latin orthography (ı ö ü ñ j ch sh); the league's name keeps the canon spelling *Irad Ligasy*.
  Language is remembered in `localStorage` `iradleague_lang`; `?lang=ir` / `?lang=ru` also work.
- `assets/site.css`: navy `#0b1a30` header, crimson `#c0142f` rule (the national colours), Exo 2 for headings and
  Inter for text (Google Fonts), tabular numerals in tables. Tables scroll inside their own box on phones.
- `assets/crests/`: club crests copied from the lore's brand packages (`<id>.svg` full, `<id>-small.svg` for rows).
- `assets/ffi-mark.svg`: the federation mark (crimson shield, white ball, Polaris). Favicons (`favicon.ico`,
  `favicon-32.png`, `apple-touch-icon.png`, `assets/favicon.svg`, `assets/icon-192/512.png`) and the share image
  `assets/og-image.png` (1200×630) are rendered from it.
- Analytics: the shared GoatCounter + Google Analytics snippet in every page head.

## Data

| File | What |
|---|---|
| `data/clubs.json` | `clubs` (id, names in three languages, city, founded, colours, ground, owner, titles, history in en/ru) and `grounds` |
| `data/season-2026.json` | the 27 rounds: date, matches (home, away, time, venue, score, optional `tv`, `referee`) and `notes` for weekends without a round |
| `data/champions.json` | champions and runners-up by year, the league's format by period, the derby record to the end of 2025 |
| `data/news.json` | federation news: `title` and `summary` in three languages, `body` in en and ru |
| `data/cup-2026.json` | Irad Cup semi-finals and final |
| `data/first-league-2026.json`, `data/womens-league-2026.json` | standings tables only (published as tables, not computed) |

The Irad League table, form guide, title race, club pages and derby record are computed in the browser from
`season-2026.json`, so a result entered there updates every page.

## Adding a round's results

1. In `data/season-2026.json`, find the round (`"round": 26`) and replace each match's `"score": null` with
   `[home goals, away goals]`, e.g. `"score": [2, 1]`. A round can be filled in match by match.
2. Optionally remove `referee` and `tv` once played (they are hidden for played matches anyway).
3. Add a news item to `data/news.json` (`id`, `date`, `tag`: `league`, `cup`, `women` or `federation`; `title` and
   `summary` in en/ir/ru; `body.en` and `body.ru` paragraphs). Keep it in the federation's neutral, official tone and
   use only results and facts already in canon or approved desk cards.
4. Check: serve the parent folder (`cd .. && python3 -m http.server`) and open `/irad-league/`.

The home page declares the champions automatically once no other club can catch the leader. When the season is
over, add the champion to `data/champions.json` (and the runner-up), and the 2026 derby result is already counted in
the derby record from the season file. For 2027 add `data/season-2027.json` and change `SEASON_FILE` in `site.js`.

Kick-off times are Irad Time (UTC+6). Statuses use the visitor's clock converted to Irad Time: a match without a
score after its kick-off shows "Result to follow".

## Checking

Serve from the parent folder so relative paths are tested the GitHub Pages way, then look at every page in all
three languages at desktop and phone widths. The site requests only its own files, Google Fonts and the analytics.
