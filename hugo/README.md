# Hugo editable-regions: bare YAML datetimes break the Visual Editor

Minimal Hugo site for reproducing a Visual Editor failure in
[`CloudCannon/editable-regions`](https://github.com/CloudCannon/editable-regions)
(`v0.0.21`, Hugo `0.164.0`). The module is vendored in `_vendor/`, so the build
doesn't need Go.

`hugo` builds this site cleanly. Every date below is valid for Hugo.

## Steps

1. Create a CloudCannon site from this repo with `hugo/` as its source folder,
   or run `cloudcannon dev public` from `hugo/` after building.
   `hugo/.cloudcannon/initial-site-settings.json` sets Hugo `0.164.0`.
2. Open the Home page in the Visual Editor.

## Expected

The `card` and `post-list` components render.

## Actual

The page loads briefly, then every component shows an error card:

```
Failed to render Hugo component "card": editor site build failed:
build after pending content changes: logged 1 error(s).
```

This includes `post-list`, which never reads a date. The components stay broken
after edits.

## Cause

The CloudCannon API returns bare YAML datetimes as RFC 9557 strings, which add
a bracketed time-zone annotation to the timestamp. editable-regions passes these
strings to Hugo unchanged (`JSON.stringify(await file.data.get())` in
`integrations/hugo/browser/index.ts`), and Hugo can't parse the annotation:

```
ERROR the "date" front matter field is not a parsable date
```

`layouts/partials/date-probe.html` logs what the API returns for each file in
the editor:

| File | `date:` in source (unquoted) | `data.get().date` | Hugo 0.164 |
| --- | --- | --- | --- |
| `_index.md` | `2026-09-01` | `"2026-09-01T00:00:00Z"` | parses |
| `bare-variant-1.md` | `2026-09-01T10:30:00Z` | `"2026-09-01T10:30:00+00:00[UTC]"` | **fails** |
| `bare-variant-2.md` | `2026-09-01T10:30:00` | `"2026-09-01T10:30:00+00:00[UTC]"` | **fails** |
| `bare-variant-3.md` | `2026-09-01 10:30:00` | `"2026-09-01T10:30:00+00:00[UTC]"` | **fails** |
| `bare-variant-4.md` | `2026-09-01T10:30:00+10:00` | `"2026-09-01T10:30:00+10:00[+10:00]"` | **fails** |
| `bare-variant-5.md` | `2026-09-01 10:30:00 +10:00` | `"2026-09-01T10:30:00+10:00[+10:00]"` | **fails** |
| `bare-variant-6.md` | `2026-09-01T10:30:00.123-05:00` | `"2026-09-01T10:30:00.123-05:00[-05:00]"` | **fails** |
| `quoted-date.md` | `"2026-09-02"` | `"2026-09-02"` | parses |

Without the `[...]` suffix, every one of those strings parses in Hugo 0.164
with the correct offset. Any front matter or dataset value with a time can
trigger this, not just `date`.

Two things make it worse:

- **The build keeps failing.** Hugo's build returns an error before the
  renderer clears its pending changes, so every later render retries the same
  failing build. That's why every component stays broken.
- **The error card doesn't help.** It shows only the error count. Its "open the
  console" hint never appears either: the hint matches `/logged \d+ errors/`
  (`integrations/hugo/browser/errors.ts`), but Hugo's message is
  `logged 1 error(s)`.

## Workaround

Quote datetimes in front matter and data files. CloudCannon passes quoted
strings through unchanged.

## Suggested fix

- Strip a trailing RFC 9557 annotation (`[...]`) from timestamp strings before
  sending them to the renderer, for both front matter and datasets. The offset
  is already in the string, so Hugo still gets the right instant.
- Show Hugo's logged error text on the error card, and fix the hint regex so it
  matches `error(s)`.
