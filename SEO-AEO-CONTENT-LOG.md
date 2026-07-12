# Madison County Roofing — SEO / AEO Content Log

Data-driven SEO/AEO retrofit, 2026-07-12. The site was built + deployed before DataForSEO went live (2026-07-06); this pass back-validates the architecture against real search data and brings it to the current LocalCraft Digital build standard. Model: **Opportunity = Volume x Winnability x Intent.** Raw data: `brand-kit/keyword-data.json`. Strategy: `brand-kit/keyword-strategy.json` + `brand-kit/strategy-foundation.md`.

## Pages added (6)

| URL | Target query | Volume (IL) | Data justification |
|---|---|---|---|
| `/roof-inspection` | roof inspection | 1,600/mo | No local roofer owns the SERP (national info + YouTube), AI Overview triggers, MCR gives free in-person inspections. Biggest unclaimed opening. |
| `/service-area/granite-city` | roofing Granite City IL | 10 (bucketed) | MCR already #2 organic; weak pack (R&R 18–47, Bull 67). |
| `/service-area/troy` | roofing Troy IL | 10 | No local pack at all; AI Overview triggers. |
| `/service-area/glen-carbon` | roofing Glen Carbon IL | null→SERP | No local pack; AI Overview triggers. |
| `/service-area/maryville` | roofing Maryville IL | null→SERP | No local pack; AI Overview triggers. |
| `/service-area/edwardsville` | roofing Edwardsville IL | 10 | Contested (Stonebridge, H&F 837) but the biggest satellite market; won on 1937 roots. |

Every city page carries at least three genuinely local elements (named neighborhoods/subdivisions, real housing-stock era, verified recent hail/storm events, drive time + route from Collinsville, permit authority) sourced from per-town web research. Anti-doorway: no name-swaps. Each has a city-qualified FAQPage (schema verbatim-matched to the DOM), a `Service` node with `areaServed` set to that town, and a §4c NWS citation.

## Pages strengthened

- `/service-area` — converted to a HUB: answer-first intro, links every town page, freshness stamp. Linked from nav + footer sitewide.
- Home + residential + commercial + storm + siding + about — brought to standard (see below).

## AEO answer-first structure

- Answer-first lead added to home + every service + every city page: a question-phrased H2 with a 40–60 word self-contained answer capsule (no pronoun opener, real entity named in sentence one) in the top ~30%.
- FAQPage now on home, all service pages, contact, roof-inspection, and all 5 city pages (city-qualified). Schema answer text matches the visible DOM verbatim.
- `llms.txt` refreshed with roof-inspection, the 5 town pages, and a roof-inspection Q&A.
- AI Overviews confirmed triggering on "roofers" @ Collinsville, "metal roofing" @ Collinsville, and "roofing {town}" @ Troy/Glen Carbon/Maryville — AEO is a live lever here, not just a forward bet.

## Schema / technical

- Every cornerstone + city page now emits ONE connected `@graph`: `WebSite` + `WebPage`(with `dateModified`) + `RoofingContractor`(`#business`, sameAs≥4, `founder`→`#person-owner`) + `Person`(Mark Eck, `#person-owner`) + `Service` + `BreadcrumbList` + `FAQPage`. (§4a Person, §4b sameAs, §4d freshness.)
- **sameAs (4, real):** Google Business Profile (cid), Facebook, Yelp, BBB.
- **§4c citations:** each cornerstone page carries ≥1 sourced fact + a real outbound authority link (NRCA, NWS St. Louis, Insurance Information Institute, IDFPR) — all URLs verified 200.
- **§4d freshness:** visible "Last updated July 12, 2026" + schema `dateModified` on home, all service pages, city pages, about, service-area.
- Titles 50–60 chars, meta descriptions 150–160, one H1/page, self-referencing canonical, all 18 JSON-LD blocks valid.
- `sitemap.xml`: 18 URLs (6 new). Nav + footer unified across all pages.

## Ranking-intent coverage map

| Target query | Intent | Page | Status |
|---|---|---|---|
| roof replacement | ready-to-book | /residential-roofing | ✅ #1 organic |
| roof inspection | solution-aware | /roof-inspection | ✅ NEW |
| hail damage / insurance | problem-aware | /storm-damage | ✅ |
| commercial / EPDM | solution-aware | /commercial-roofing | ✅ |
| siding / gutters | solution-aware | /siding-gutters | ✅ |
| roofing {Granite City/Troy/Glen Carbon/Maryville/Edwardsville} | local | /service-area/{town} | ✅ NEW |
| roofing Collinsville / Madison County | local head | / (home) | ✅ owned by home |

Deliberately NOT targeted (see `cutKeywords`): bare "roofers"/"roof repair" head (directory-owned), "metal roofing" (retail-owned + unconfirmed offering), gutter-specialist packs, St. Louis/Missouri terms, roof financing (cash/check).

## Open operator items

- **Metal roofing** (2,900/mo): confirm at the client reveal whether MCR installs residential metal; build `/metal-roofing` only if the offering is real. Not built.
- **Owner headshot** for the About E-E-A-T bio (built without a photo; `<!-- TODO: owner headshot -->` in place).
- **Google Business Profile** review-generation habit: MCR has 7 Google reviews (5.0) vs incumbents at 140–390. This is the map-pack lever the on-page work cannot move alone.
- **Pre-existing em dashes** in the original hand-written copy (~130 across the older pages) are a copy-standards violation flagged for a dedicated rewrite pass (rewrite, not substitute). All new content is em-dash-free.

**Total page count: 18** (12 original + 6 new).
