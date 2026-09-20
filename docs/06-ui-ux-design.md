# INFRA Watch Interface Standard

This document is the implementation contract for INFRA Watch interface design and user-facing copy. When it conflicts with an older mockup, follow the live tokens in `app/globals.css` and this document.

## 1. Product character

INFRA Watch is an operational monitoring product for public infrastructure. The interface must feel:

- factual and accountable
- calm under dense data
- specific to project delivery and budget oversight
- usable with keyboard, touch, zoom, and assistive technology

Do not use ornamental gradients, glass effects, decorative glow, excessive card nesting, generic AI symbolism, or marketing language.

## 2. Canonical visual tokens

The live application uses the following product direction:

- Primary action and navigation: Indigo
- Supporting accent: Safety orange
- Neutral surfaces and text: Slate
- Destructive or confirmed delay: Red
- Warning or at-risk state: Amber
- Successful or on-schedule state: Green
- Unknown or not assessed: Slate with an explicit text label

Use semantic application tokens such as `primary`, `accent`, `destructive`, `muted`, and chart tokens where possible. Do not introduce a one-off brand color when an existing token communicates the same role.

Color must not be the only state indicator. Every status needs visible text, an icon, a pattern, or another non-color cue.

## 3. Typography

- Body and controls: Poppins through `--font-poppins`
- Headings: Outfit through `--font-outfit`
- Identifiers and code-like values: Geist Mono through `--font-geist-mono`
- Page title: 24px on compact screens, 30px on larger screens
- Section heading: at least 18px and semibold
- Body and control labels: normally 14px
- Supporting metadata: at least 12px with sufficient contrast

Avoid 10px and 11px text for meaningful labels, metadata, controls, or disclaimers. Use tabular numerals for financial values, percentages, durations, and counts where alignment helps comparison.

## 4. Layout and hierarchy

- Keep admin page content within a readable maximum width while preserving room for data tables.
- Establish one clear first-read path: freshness and actions, filters, primary measures, exceptions, project evidence, then supporting analysis.
- Avoid equal-weight card grids when measures have different operational importance.
- Prefer spacing, typography, and restrained borders over nested panels and shadows.
- Use no more than two primary analytical charts in the first dashboard view. Put supporting evidence in a clearly named disclosure section.
- Do not hide unavailable or insufficient-evidence states by removing the section.

## 5. Controls and responsive behavior

- Interactive controls should provide an approximately 44 by 44 pixel target.
- Keep labels visible. Do not rely on icon-only controls when text can fit.
- Native selects, text inputs, filter chips, and icon buttons must meet the touch-target baseline.
- Wide data tables must identify themselves as horizontally scrollable, be keyboard focusable, and show a compact-screen scrolling instruction.
- Horizontal scrolling must remain inside the table region, not the whole page.
- Do not remove decision-critical columns on mobile without providing an equivalent detail path.

## 6. Data truthfulness

- State the denominator used for every rate.
- Separate data coverage from the measured result.
- Use `Unavailable`, `Unknown`, `Cannot be assessed`, and stale-data language deliberately. Do not replace them with a dash.
- Never describe allocated budget or supplier bid amounts as spending, disbursement, expenditure, or utilization.
- `allocated_amount` is the approved budget.
- `abc` is the supplier's actual bid amount despite its source field name.
- Distinguish the schedule assessment date from source synchronization time.
- Do not imply a trend, comparison, forecast, or recommendation unless the underlying data supports it.

## 7. Dashboard terminology

Use these canonical labels:

- On schedule
- At risk of delay
- Delayed
- Cannot be assessed
- Projects needing attention
- Data coverage
- Projects requiring review
- Schedule and progress
- Other key metrics

Chart headings should state the management question or evidence shown. Action labels should identify the result, such as `Open project list` or `Apply filter`, instead of `View details`.

## 8. AI-assisted features

ANIA supports analysis but is not the visual center of the product.

- Use a conversation or document icon, not sparkles or magic-wand imagery.
- Label generated content as AI-generated and keep verification guidance visible.
- State the authorized scope and assessment date.
- Do not call current-rule classifications predictions.
- Do not present generated recommendations as official decisions.
- Preserve loading, cancellation, retry, timeout, and unavailable states.

## 9. Accessibility and contrast

- Normal text must meet WCAG AA contrast of at least 4.5:1.
- Large text and essential graphical elements must meet their applicable WCAG thresholds.
- Avoid Slate 400 on white or Slate 50 for normal text.
- In dark mode, avoid Slate 500 on Slate 900 or Slate 950 for normal text.
- Every interactive control needs a visible keyboard focus state.
- Charts need a text summary, useful tooltip, and keyboard-operable filter or project-list alternative.
- Respect reduced-motion preferences for animations.

## 10. Copy standard

Write short operational language. Prefer the exact project, schedule, budget, region, source, or action being discussed.

Avoid:

- generic headings such as `Insights`, `Detailed Analytics`, or `More metrics`
- marketing phrases such as `seamless`, `powerful`, `next generation`, `unlock`, or `transform`
- vague actions such as `Learn more`, `Explore`, or `View details`
- em dashes in user-facing copy
- explanatory prose that claims evidence not present in the source data

Valid domain words such as project, region, budget, status, delay, and progress should not be renamed merely to sound different.

## 11. Verification

For dashboard or design-system changes:

1. Add or update focused rendering and behavior tests.
2. Run the dashboard test set.
3. Run TypeScript without emit.
4. Run ESLint on changed application files.
5. Run `git diff --check`.
6. Inspect desktop and compact layouts in a browser when an authenticated runtime is available.
7. Confirm that no unrelated working-tree changes were altered.
