# Eleventy editable-regions: bare YAML datetimes disappear in the Visual Editor

A minimal Eleventy site that reproduces a Visual Editor problem in
[`CloudCannon/editable-regions`](https://github.com/CloudCannon/editable-regions)
(`v0.0.21`, Eleventy `3.1`). It's the Eleventy version of
[Hugo repro](../hugo/), with the
same content.

`npm run build` builds the site cleanly, and every date below is valid for Eleventy.

## Steps

1. Create a CloudCannon site from this repo with `eleventy/` as its source folder,
   or build it and run
   `cloudcannon dev _site` from `eleventy/`.
2. Open the Home page in the Visual Editor.

## Expected

All four components render the same as on the built site, e.g.
`post.date = [2026-09-01T10:30:00Z], post.data.date | date = [2026-09-01 10:30]`.

## Actual

Nothing errors, but the dates are wrong:

- `card` and `post-list` render. Unlike Hugo, one bad date doesn't break
  components that never read it.
- In `post-dates`, each bare-variant post shows `post.date = []`, and
  `post.data.date | date` prints the raw API string,
  e.g. `[2026-09-01T10:30:00+00:00[UTC]]`. The quoted control renders a date
  (as `2026-09-02T00:00:00.000Z`: the editor's `dateToRfc3339` port keeps
  milliseconds and the build's doesn't, which is a separate small difference).
- `event-card` renders `Starts: []`. Its `starts` prop is a bare datetime in
  `src/index.md`.

## Cause

The CloudCannon API returns bare YAML datetimes as RFC 9557 strings, which add
a bracketed time-zone annotation to the timestamp. editable-regions passes these
strings to the in-browser Liquid renderer unchanged, and JavaScript's `Date`
can't parse the annotation:

```js
new Date("2026-09-01T10:30:00+00:00[UTC]"); // Invalid Date
```

- `post.date` / `page.date` come from `toDate()` in
  `integrations/liquid/globals.mjs`, which returns `undefined` for an invalid
  date.
- The editor's `dateToRfc3339` port (`integrations/eleventy/browser/liquid-builtins.mjs`)
  prints `""` for an invalid date.
- LiquidJS's `date` filter prints any input it can't parse unchanged.

The API values below come from the Hugo repro's probe. This site has the same
probe (`src/_includes/date-probe.liquid`), which logs `[date-probe]` lines to the
editor console so you can confirm them here.

| File | `date:` in source (unquoted) | `data.get().date` | `new Date()` |
| --- | --- | --- | --- |
| `index.md` | `2026-09-01` | `"2026-09-01T00:00:00Z"` | parses |
| `bare-variant-1.md` | `2026-09-01T10:30:00Z` | `"2026-09-01T10:30:00+00:00[UTC]"` | **Invalid Date** |
| `bare-variant-2.md` | `2026-09-01T10:30:00` | `"2026-09-01T10:30:00+00:00[UTC]"` | **Invalid Date** |
| `bare-variant-3.md` | `2026-09-01 10:30:00` | `"2026-09-01T10:30:00+00:00[UTC]"` | **Invalid Date** |
| `bare-variant-4.md` | `2026-09-01T10:30:00+10:00` | `"2026-09-01T10:30:00+10:00[+10:00]"` | **Invalid Date** |
| `bare-variant-5.md` | `2026-09-01 10:30:00 +10:00` | `"2026-09-01T10:30:00+10:00[+10:00]"` | **Invalid Date** |
| `bare-variant-6.md` | `2026-09-01T10:30:00.123-05:00` | `"2026-09-01T10:30:00.123-05:00[-05:00]"` | **Invalid Date** |
| `quoted-date.md` | `"2026-09-02"` | `"2026-09-02"` | parses |

Without the `[...]` suffix, every one of those strings parses with the correct
offset. Any front matter or data value with a time can trigger this, not just
`date`.

## Workaround

Quote datetimes in front matter and data files. CloudCannon passes quoted
strings through unchanged.
