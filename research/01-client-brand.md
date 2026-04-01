## Brand Snapshot
- **Company:** Yanfaa (ينفع.كوم)
- **Primary Color:** `#1ab394` (inferred from production CSS frequency)
- **Secondary Color:** `#252541`
- **Accent Color:** `#09d491`
- **Fonts:** IBM Plex Sans Arabic (site-declared) / system sans stack
- **Tone:** Practical
- **Core Message:** منصة تعليمية عربية تقدم كورسات في مجالات متعددة باشتراك واحد مناسب للميزانية.

## Source Capture
- Primary URL: https://yanfaa.com/
- OG title: `Yanfaa.com - ينفع.كوم`
- OG description: `ينفع هي اول منصة تعليمية عربية تمكنك من مشاهدة جميع الكورسات في مجالات مختلفة باشتراك واحد يناسب ميزانيتك.`
- OG image/logo candidate: https://app.yanfaa.com/storage/images/yanfaa.png
- Sitemap: https://yanfaa.com/sitemap.xml (490 URLs discovered)

## Brand Assets
### Logo candidates
- Main OG image: `https://app.yanfaa.com/storage/images/yanfaa.png`
- Favicon: `https://yanfaa.com/assets/images/favicons/new/favicon.png`

### Colors (extracted from compiled stylesheet)
Top recurring hex values in production CSS (`styles.061ca90473f68432e74c.css`):
- `#1ab394`, `#09d491`, `#252541`, `#161616`, `#fff`, `#f8f9fa`

Note: the CSS bundle includes framework/system colors (Bootstrap-like tokens). Brand colors above are selected from non-generic recurring values and should be verified against logo files.

### Typography
- Google Font declared in HTML head: `IBM Plex Sans Arabic`.
- Additional icon/video fonts found in compiled CSS (e.g., `VideoJS`) are implementation fonts, not brand typography.

## Tone of Voice
Observed tone from metadata and route naming:
- Direct, budget-aware, utility-first.
- Emphasis on accessibility and breadth (“all courses”, “one subscription”, “fits your budget”).

## Key Messaging
Current value proposition (from OG description):
- Arabic-first educational platform
- Broad catalog across fields
- One subscription price point

## Existing Content Surface (from available crawlable app shell + sitemap)
Because Yanfaa is an SPA, route content is rendered in JS and not directly visible in static HTML responses. Route architecture from sitemap indicates:
- Core pages: `/eg/home`, `/eg/browse`, `/eg/learning-paths`, `/eg/subscribe`, `/eg/login`, `/eg/register`
- Trust/legal: `/eg/terms-and-conditions`, `/eg/privacy-and-policy`
- Support: `/eg/y/support`
- Catalog depth: many `/eg/single/...` entries and category/learning-path routes

## Site Structure Summary
- Total discovered URLs in sitemap: **490**
- High-level structure:
  - Discovery: home, browse, search
  - Conversion: subscribe, login, register
  - Learning product: learning paths, single-course pages
  - Support/compliance: support, privacy, terms

## Gaps / Opportunities
- Public metadata is strong, but homepage copy hierarchy is not crawl-visible in SSR output.
- Brand color system appears present but not documented as design tokens publicly.
- Opportunity to differentiate with clearer “who this is for” segmentation and stronger onboarding paths.

## Evidence Links
- https://yanfaa.com/
- https://yanfaa.com/sitemap.xml
- https://yanfaa.com/styles.061ca90473f68432e74c.css
- https://app.yanfaa.com/storage/images/yanfaa.png
