# MAZE Studio — Project Guidelines for Claude Code

## Skills

@.claude/skills/emilkowal-animations.md

## Project Stack

- Next.js 14 App Router
- TypeScript
- Tailwind CSS (CSS variable–driven theming)
- Framer Motion (component animations)
- GSAP (scroll-triggered effects)
- Lenis (smooth scroll)
- next-intl v4 (EN/RU i18n)
- next-themes (dark/light toggle)

## Architecture

- `app/(public)/[locale]/` — public pages (en = no prefix, ru = /ru prefix)
- `app/admin/` — admin panel (JWT-protected, no locale wrapping)
- `components/home/` — homepage sections
- `components/layout/` — Navbar, Footer, CustomCursor, SmoothScroll
- `i18n/` — routing.ts, request.ts, navigation.ts
- `messages/` — en.json, ru.json

## Animation Rules (from Emil Kowalski's skill)

Always follow these when writing animations:
- Use `ease-out` for entering elements, `ease-in-out` for on-screen movement, never `ease-in` for UI
- Duration: buttons 100-160ms, tooltips/popovers 125-200ms, modals/drawers 200-500ms, max 300ms for UI
- Only animate `transform` and `opacity` (GPU-accelerated)
- Start from `scale(0.95)` + `opacity: 0`, never from `scale(0)`
- Add `scale(0.97)` on `:active` for all pressable elements
- Stagger list items 30-80ms apart
- Asymmetric timing: enter can be slower, exit always fast (≤200ms)
- Respect `prefers-reduced-motion`
- Gate hover transforms behind `@media (hover: hover) and (pointer: fine)`
