# editable-regions: bare YAML datetimes in the Visual Editor

Minimal Hugo, Astro, and Eleventy sites that reproduce the same Visual Editor
problem in
[`CloudCannon/editable-regions`](https://github.com/CloudCannon/editable-regions)
`v0.0.21`. Each folder is a standalone site with the same content, its own
CloudCannon config, and its own README with steps and details.

| Folder | SSG | What happens in the Visual Editor |
| --- | --- | --- |
| [`hugo/`](hugo/) | Hugo 0.164.0 | **Every component errors**, including ones that never read a date, and they stay broken after edits. |
| [`astro/`](astro/) | Astro 7.3 | Components that format a date throw (`RangeError: Invalid time value`) or render "Invalid Date". Other components work. |
| [`eleventy/`](eleventy/) | Eleventy 3.1 | Nothing errors, but dates come out blank or as the raw API string. |

Every site builds cleanly, and every date is valid for its SSG. The problem only
shows up in the Visual Editor.

## Cause

The CloudCannon Visual Editor API (`file.data.get()`) returns bare YAML
datetimes as RFC 9557 strings, which add a bracketed time-zone annotation to
the timestamp. editable-regions passes these strings to the in-browser
renderers unchanged, and neither Hugo nor JavaScript's `Date` can parse the
annotation.

| `date:` in source (unquoted) | `data.get().date` | Hugo | `new Date()` |
| --- | --- | --- | --- |
| `2026-09-01` | `"2026-09-01T00:00:00Z"` | parses | parses |
| `2026-09-01T10:30:00Z` | `"2026-09-01T10:30:00+00:00[UTC]"` | **fails** | **Invalid Date** |
| `2026-09-01T10:30:00` | `"2026-09-01T10:30:00+00:00[UTC]"` | **fails** | **Invalid Date** |
| `2026-09-01 10:30:00` | `"2026-09-01T10:30:00+00:00[UTC]"` | **fails** | **Invalid Date** |
| `2026-09-01T10:30:00+10:00` | `"2026-09-01T10:30:00+10:00[+10:00]"` | **fails** | **Invalid Date** |
| `2026-09-01 10:30:00 +10:00` | `"2026-09-01T10:30:00+10:00[+10:00]"` | **fails** | **Invalid Date** |
| `2026-09-01T10:30:00.123-05:00` | `"2026-09-01T10:30:00.123-05:00[-05:00]"` | **fails** | **Invalid Date** |
| `"2026-09-02"` (quoted) | `"2026-09-02"` | parses | parses |

The API values were logged in the Hugo site. Each site has the same
`date-probe` script, which logs `[date-probe]` lines to the editor console so
you can check them in any of the three.

Without the `[...]` suffix, every one of those strings parses with the correct
offset. Any front matter, data file, or component prop with a time can trigger
this, not just `date`.

Hugo fails hardest for two reasons:

- It parses every page's date during the build, and a single logged error
  fails the whole build.
- editable-regions then retries the same failing build on every render.

See [`hugo/README.md`](hugo/README.md) for details.

## Workaround

Quote datetimes in front matter and data files. CloudCannon passes quoted
strings through unchanged.

## Suggested fix

Strip a trailing RFC 9557 annotation (`[...]`) from timestamp strings before
data reaches any renderer: front matter, datasets, and component props. The
offset is already in the string, so the instant stays correct. For Hugo, also
stop retrying a failed build, and show Hugo's logged error text on the error
card.
