# Performance log — Madison County Roofing

Internal. Excluded from the deploy by `.vercelignore` (`/*.md`).

## Measurement of record — 2026-08-26

All numbers produced by `clients/localcraft-digital/scripts/lighthouse-true.mjs`
(BUILD-STANDARDS §22b), which serves a throwaway copy with the staging `noindex` and the
staged `robots.txt` neutralized IN THE COPY, so the SEO category reflects launch state.
The real build is never modified. Lighthouse 12, explicit `CHROME_PATH`, Chrome 152.

Every page, both form factors:

| Page | Mobile P | Desktop P | A11y | Best practices | SEO | CLS |
|---|---|---|---|---|---|---|
| `/` | 83 | 95 | 100 | 100 | 100 | 0 |
| `/residential-roofing/` | 86 | 99 | 100 | 100 | 100 | 0 |
| `/commercial-roofing/` | 94 | 100 | 100 | 100 | 100 | 0 |
| `/roof-inspection/` | 89 | 99 | 100 | 100 | 100 | 0 |
| `/storm-damage/` | 85 | 99 | 100 | 100 | 100 | 0 |
| `/siding-gutters/` | 88 | 100 | 100 | 100 | 100 | 0 |
| `/service-area/` | 93 | 100 | 100 | 100 | 100 | 0 |
| `/service-area/troy/` | 87 | 99 | 100 | 100 | 100 | 0 |
| `/service-area/glen-carbon/` | 87 | 99 | 100 | 100 | 100 | 0 |
| `/service-area/maryville/` | 88 | 99 | 100 | 100 | 100 | 0 |
| `/service-area/granite-city/` | 87 | 99 | 100 | 100 | 100 | 0 |
| `/service-area/edwardsville/` | 87 | 99 | 100 | 100 | 100 | 0 |
| `/about/` | 88 | 100 | 100 | 100 | 100 | 0 |
| `/our-work/` | 81 | 99 | 100 | 100 | 100 | 0 |
| `/testimonials/` | 92 | 100 | 100 | 100 | 100 | 0 |
| `/contact/` | 87 | 100 | 100 | 100 | 100 | 0 |
| `/privacy/` | 92 | 100 | 100 | 100 | 100 | 0 |
| `/terms/` | 92 | 100 | 100 | 100 | 100 | 0 |

**Accessibility, Best Practices and SEO are 100 on all 18 pages on both form factors, and
CLS is 0 everywhere.** Desktop performance is 95 to 100.

## The mobile shortfall, stated plainly

§22 requires mobile performance of 100, or **≥90 with a written attribution**. This build does
not meet that bar on every page. Six pages clear 90 (`commercial-roofing` 94, `service-area` 93,
`testimonials` 92, `privacy` 92, `terms` 92). The rest sit between **81 and 89**. That is a real
gap against the standard and it is recorded here rather than rounded away.

**What the number is made of.** Mobile LCP runs 3.0s to 5.1s. The phase breakdown on the worst
page shows the shape of it:

```
/our-work/  LCP 5.1s     TTFB  459ms  10%
                         Load Delay 2111ms  44%   <- fixed, see below
                         Load Time   547ms  11%
                         Render Delay 1702ms 35%  <- Lantern 4x CPU throttle
```

TBT is **0ms** and CLS is **0** on every page. Nothing is blocking the main thread and nothing
moves. The score is LCP, and LCP is dominated by render delay under Lighthouse's simulated
4× CPU throttle against a full-bleed hero photograph. That is the artifact §22 names.

## What was actually fixed today (not excused)

1. **Google Fonts CDN removed.** Three faces were hot-linked from `fonts.gstatic.com`, a
   render-blocking third-party round trip on the critical path and a §6b violation. Now
   self-hosted latin-subset variable woff2, same origin, preloaded, with metric-matched
   fallbacks measured off the real files with fontTools.
2. **The paint-gating guard was retired.** A script held the hero at `opacity: 0` until Fraunces
   loaded, to hide a reflow. It was also holding back LCP by design. With the font same-origin,
   preloaded and `font-display: optional`, there is no swap to hide, so the guard was pure cost.
3. **Responsive WebP heroes.** Interior heroes were full-size JPEGs with no `srcset`; Lighthouse
   put "properly size images" at ~1,280ms. Every hero now ships 640/960/1280/1600 WebP. The worst
   case went 371KB to 71KB at the width a phone actually requests.
4. **Hero preload on every page.** Eleven pages never preloaded their hero, so it was discovered
   late: 2,111ms of pure Load Delay on `/our-work/`. All now preload with a matching
   `imagesrcset`.
5. **False `srcset` descriptors corrected.** A first pass declared several portrait job photos as
   `1600w` when the files are `750w`. The browser trusts the descriptor, so it mis-selected and
   `/our-work/` regressed 81 to 61. Descriptors now carry true intrinsic widths, and the page
   recovered to 81.

Net: `/residential-roofing/` 67 to 86, `/contact/` 71 to 87, `/service-area/troy/` 71 to 87,
`/about/` to 88, `/commercial-roofing/` to 94.

## What is left, if 90+ everywhere is wanted

The remaining lever is the full-bleed hero itself, not the delivery. Options, in order of
honesty about cost:

- Serve a smaller intrinsic hero on phones (a dedicated ~480w art-directed crop rather than a
  scaled-down landscape). Real work, real design review, and it changes the look on mobile.
- Drop the Ken Burns transform on the hero image at mobile widths, which removes a compositing
  cost during the LCP window.
- Accept the artifact. On a real phone these pages paint in about a second; the Lantern number
  is a simulation of a bad connection on a slow device.

**Not done, and deliberately so:** nothing here was "fixed" by deleting content, shrinking the
hero into a thumbnail, or quoting a desktop number as if it were the mobile one.

## Old site, for comparison (`madisoncountyroofing.com`, measured 2026-08-26)

| | Mobile | Desktop |
|---|---|---|
| Performance | **48** (median of 2 runs) | 95.5 |
| Accessibility | 82 | 82 |
| Best practices | 79 | 81 |
| SEO | 92 | 92 |
| LCP | **11.4s** | 1.3s |

161 KB of HTML, 41 stylesheets, 27 external scripts, 1,740 KiB over 110 requests.
Note for anyone quoting this: the old site is slow **on mobile only**. Its desktop performance
is genuinely good and saying otherwise in front of the owner is refutable on the spot.
