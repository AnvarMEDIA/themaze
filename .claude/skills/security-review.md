# Security Review Skill

Source: https://github.com/affaan-m/ECC — adapted for this Next.js project.

## When to Activate

- Implementing authentication or authorization
- Handling user input or file uploads
- Creating new API endpoints
- Working with secrets or credentials
- Storing or transmitting sensitive data
- Integrating third-party APIs (Claude, Vercel Blob, Telegram)

---

## Security Checklist

### 1. Secrets Management
- [ ] No hardcoded API keys, tokens, or passwords in source
- [ ] All secrets in environment variables (`ADMIN_PASSWORD`, `JWT_SECRET`, `ANTHROPIC_API_KEY`, `BLOB_READ_WRITE_TOKEN`)
- [ ] `.env.local` in `.gitignore`
- [ ] `requireEnv()` used — fail hard at startup if secrets missing
- [ ] Production secrets set in Vercel dashboard

### 2. Input Validation
- [ ] All user inputs validated with Zod schemas (see `lib/validation.ts`)
- [ ] File uploads restricted: size ≤ 10 MB, no SVG (XSS), allowed types only
- [ ] No direct interpolation of user data into Claude prompts — wrap in `JSON.stringify()`
- [ ] Error messages generic in production (`NODE_ENV === 'production'`)

### 3. Authentication & Authorization
- [ ] All admin API routes call `getAdminSession()` before any operation
- [ ] JWT stored in `httpOnly; Secure; SameSite=Strict` cookie
- [ ] Public GET routes that return private data are auth-protected
- [ ] Rate limiting on auth endpoints: login 5/15min per IP

### 4. Rate Limiting
- [ ] Auth endpoints: 5 req / 15 min
- [ ] Public form submissions (inquiry, brief): 3–5 req / 10 min
- [ ] Public data GET endpoints (portfolio, partners, testimonials): 60 req / min
- [ ] Paid AI endpoints (translate, generate-seo): 20 req / min
- [ ] Uses `rateLimitAsync()` from `lib/rateLimit.ts` (Upstash Redis + in-memory fallback)

### 5. XSS Prevention
- [ ] No `dangerouslySetInnerHTML` with unsanitized content
- [ ] SVG uploads blocked (can embed `<script>`)
- [ ] CSP configured in `next.config.js` — `default-src 'self'`, `frame-ancestors 'none'`
- [ ] `unsafe-eval` dropped in production

### 6. HTTP Security Headers (next.config.js)
All of these must be present in the `headers()` array:
- `Content-Security-Policy` ✓
- `X-Content-Type-Options: nosniff` ✓
- `Referrer-Policy: strict-origin-when-cross-origin` ✓
- `Permissions-Policy: camera=(), microphone=(), geolocation=()` ✓
- `Strict-Transport-Security` (production only) ✓
- `X-Frame-Options: DENY` (belt-and-suspenders alongside CSP `frame-ancestors`) ✓

### 7. File Uploads
- [ ] Type check (MIME + extension)
- [ ] SVG explicitly blocked
- [ ] Size limit enforced server-side
- [ ] Path traversal prevented — `path.resolve()` + `startsWith(root)` check
- [ ] Files go to Vercel Blob in production, `/public/{folder}/uploads/` in dev only

### 8. CSRF
- [ ] Cookies use `SameSite=Strict` — mitigates most CSRF
- [ ] Admin mutations only reachable via same-origin requests
- [ ] No CORS wildcards on mutation endpoints

### 9. Sensitive Data
- [ ] Passwords, tokens never logged
- [ ] Stack traces not exposed to clients
- [ ] `console.error` in API routes is server-side only (not browser)
- [ ] Error boundary `console.error` acceptable (client, but only fired on crashes)

### 10. Dependencies
- [ ] Run `npm audit` regularly
- [ ] No known High/Critical CVEs in production deps
- [ ] Lock file (`package-lock.json`) committed

---

## Pre-Deployment Checklist

- [ ] No hardcoded secrets
- [ ] All API routes auth-protected or rate-limited
- [ ] SVG uploads blocked
- [ ] Security headers present (CSP, HSTS, nosniff, Referrer-Policy, Permissions-Policy)
- [ ] Error messages sanitized in prod
- [ ] `npm audit` clean or CVEs documented and mitigated
- [ ] `.env.local` NOT committed
