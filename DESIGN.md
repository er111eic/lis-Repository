---
name: XDSD Space Booking Minimal App
source:
  - VoltAgent/awesome-design-md Apple
  - VoltAgent/awesome-design-md Notion
  - VoltAgent/awesome-design-md Linear
version: 2026-05-07
---

# Design Direction

This borrowing system should feel like a quiet iOS productivity app: clear, fast to scan, and calm under repeated daily use. It borrows Apple's system typography and single blue action color, Notion's warm editorial structure and hairline cards, and Linear's restrained product-tool density.

The interface should never feel like a marketing landing page. The calendar, today's overview, and reservation sheet are the product.

# Visual Tokens

## Color

- Canvas: `#f5f5f7`
- Surface: `#ffffff`
- Raised surface: `rgba(255, 255, 255, 0.86)`
- Primary ink: `#1d1d1f`
- Secondary ink: `#6e6e73`
- Tertiary ink: `#8e8e93`
- Hairline: `rgba(60, 60, 67, 0.14)`
- Soft fill: `rgba(120, 120, 128, 0.08)`
- Strong fill: `rgba(120, 120, 128, 0.14)`
- Primary action: `#007aff`
- Primary pressed: `#005ecb`
- Academic accent: `#007aff`
- Community accent: `#ff9500`
- Destructive: `#ff3b30`
- Success: `#34c759`

Use blue only for actions, selected states, focus rings, and academic reservations. Avoid decorative gradients and broad accent washes.

## Typography

Use the system stack:

`-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", "PingFang TC", "Microsoft JhengHei", Arial, sans-serif`

- Page title: 34-40px, 700-800, tight line height
- Section title: 17-20px, 700
- Body: 15-17px, 400, line-height 1.5
- Labels and metadata: 12-14px, 600 when functional

Do not use negative letter spacing in this app. It is a tool surface, not an Apple product hero page.

## Shape

- Buttons and status chips: 999px radius
- Cards and calendar cells: 12px radius
- Sheets and large panels: 18-22px radius
- Inputs: 10-12px radius

Keep nested cards rare. Prefer grouped-list surfaces and hairline separation.

## Liquid Glass

Liquid Glass is limited to the functional control layer: account chip, sign-in button, month navigation, primary action buttons, sheet close control, sticky sheet actions, and toast.

Do not apply Liquid Glass to the content layer. Calendar cells, event cards, form groups, today's overview, and detail content should remain nearly opaque so dates, venue names, host colors, and validation states stay readable.

Use a dim overlay behind sheets, not heavy blur. Respect reduced transparency by falling back to solid controls.

## Motion

- Fast interaction: 120ms
- Base transition: 220ms
- Sheet entrance: 320-360ms
- Easing: `cubic-bezier(0.2, 0.8, 0.2, 1)`

Motion should clarify state changes: press compression, sheet rise, toast entry, and month refresh. Respect `prefers-reduced-motion`.

# Component Rules

## App Header

Keep the sign-in control small and fixed in the top-right. It is a setup action, not a daily workflow.

## Calendar

Desktop uses a month grid with quiet white cells and hairline borders. Mobile becomes a single-column agenda list. Empty leading month cells must be hidden on mobile.

Today's date uses the primary blue badge. Days with reservations should read as data-bearing rows, not decorative cards.

## Reservation Sheet

The add/edit form is a sheet. It must fit within the viewport, scroll internally, lock background scroll, and keep actions reachable at the bottom on mobile.

Form fields should use grouped spacing and 44px or larger touch targets.

## Buttons

Primary actions use blue filled pills. Secondary actions use soft gray fills. Destructive actions use red text/fill, but should remain visually quieter than the primary save action.

## Density

The app should fit real operational workflows. Avoid oversized hero layouts. Prioritize scan speed, stable dimensions, and predictable controls.
