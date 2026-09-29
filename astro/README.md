# Astro editable-regions: bare YAML datetimes show up as Invalid Date in the Visual Editor

A minimal Astro site that reproduces a Visual Editor problem in
[`CloudCannon/editable-regions`](https://github.com/CloudCannon/editable-regions)
(`v0.0.21`, Astro `7.3`). It's the Astro version of
[Hugo repro](../hugo/), with the
same content.

`npm run build` builds the site cleanly, and every date below is valid for Astro.

## Steps

1. Create a CloudCannon site from this repo with `astro/` as its source folder,
   or build it and run
   `cloudcannon dev dist` from `astro/`.
2. Open the Home page in the Visual Editor.

## Expected

All four components render the same as on the built site.

## Actual

- `card` and `post-list` render. Unlike Hugo, one bad date doesn't break
  components that never read it.
- `post-dates` shows an error card: `RangeError: Invalid time value`. It calls
  `new Date(post.data.date).toISOString()`, which throws for each bare-variant
  post.
- `event-card` renders `Starts: Invalid Date (UTC)`. Its `starts` prop is a bare
  datetime in `src/content/pages/index.md`.

## Cause

The CloudCannon API returns bare YAML datetimes as RFC 9557 strings, which add
a bracketed time-zone annotation to the timestamp. The editor's `astro:content`
shim (`integrations/astro/modules/content.js`) passes `file.data.get()` through
unchanged, and component props also come straight from the API. JavaScript's
`Date` can't parse the annotation:

```js
new Date("2026-09-01T10:30:00+00:00[UTC]"); // Invalid Date
```

The API values below come from the Hugo repro's probe. This site has the same
probe (in `src/layouts/Layout.astro`), which logs `[date-probe]` lines to the
editor console so you can confirm them here.

| File | `date:` in source (unquoted) | `data.get().date` | `new Date()` |
| --- | --- | --- | --- |
| `pages/index.md` | `2026-09-01` | `"2026-09-01T00:00:00Z"` | parses |
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

A separate issue: on the built site, `z.coerce.date()` makes `post.data.date` a
`Date`, but in the editor it's always a string. A component that calls
`post.data.date.toISOString()` directly works in the build and throws in the
editor for every post, including the quoted one. The components here use
`new Date(...)` to keep that out of this repro.

## Workaround

Quote datetimes in front matter and data files. CloudCannon passes quoted
strings through unchanged.
