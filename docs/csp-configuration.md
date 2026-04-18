# Content Security Policy

The CSP header is assembled at runtime by [`lib/security/csp.ts`](../lib/security/csp.ts)
and applied in [`lib/security.ts`](../lib/security.ts) via `addSecurityHeaders()`.

Previously the header was a single hardcoded string that mixed safe defaults
with deployment-specific CDNs (TinyMCE, Google Fonts, YouTube, Vimeo, OpenAI).
Adding or removing a third-party integration meant editing security code.
Now the directives are composed from safe defaults plus deployment-specific
additions via environment variables.

## Safe defaults (always applied)

| Directive | Always includes |
|-----------|----------------|
| `default-src` | `'self'` |
| `script-src` | `'self'` `'unsafe-inline'` |
| `style-src` | `'self'` `'unsafe-inline'` |
| `font-src` | `'self'` `data:` |
| `img-src` | `'self'` `data:` `blob:` `https:` |
| `media-src` | `'self'` `blob:` `https:` |
| `connect-src` | `'self'` + your Supabase project origin (derived from `NEXT_PUBLIC_SUPABASE_URL`) |
| `frame-src` | `'self'` |
| `worker-src` | `'self'` `blob:` |

The Supabase origin is **derived from `NEXT_PUBLIC_SUPABASE_URL`** so the CSP
targets your specific project rather than the previous `*.supabase.co` wildcard.
If the env var is unset or malformed, the policy falls back to the wildcard.

## Deployment-specific additions

Each directive has an optional `CSP_EXTRA_*` env var whose value is a
whitespace-separated list of additional origins. These are appended to the
directive without replacing the defaults.

| Env var | Directive it extends |
|---------|---------------------|
| `CSP_EXTRA_SCRIPT_SRC` | `script-src` |
| `CSP_EXTRA_STYLE_SRC` | `style-src` |
| `CSP_EXTRA_FONT_SRC` | `font-src` |
| `CSP_EXTRA_IMG_SRC` | `img-src` |
| `CSP_EXTRA_MEDIA_SRC` | `media-src` |
| `CSP_EXTRA_CONNECT_SRC` | `connect-src` |
| `CSP_EXTRA_FRAME_SRC` | `frame-src` |
| `CSP_EXTRA_WORKER_SRC` | `worker-src` |

## Recommended settings per feature

The CSP has **no opinions about which third parties you use**. Set the env
vars based on which features your deployment enables:

### AI features (OpenAI)

```bash
CSP_EXTRA_CONNECT_SRC="https://api.openai.com"
```

### TinyMCE editor (optional — ProseForge is the default)

```bash
CSP_EXTRA_SCRIPT_SRC="https://cdn.tiny.cloud"
```

### Google Fonts (if not self-hosting fonts)

```bash
CSP_EXTRA_STYLE_SRC="https://fonts.googleapis.com"
CSP_EXTRA_FONT_SRC="https://fonts.gstatic.com"
```

### Video embeds (YouTube, Vimeo, Google Meet)

```bash
CSP_EXTRA_FRAME_SRC="https://www.youtube.com https://player.vimeo.com https://*.google.com"
```

### Combining multiple sources

Env vars accept any whitespace as separator, so you can split across lines
for readability in a `.env.production` file:

```bash
CSP_EXTRA_FRAME_SRC="
  https://www.youtube.com
  https://player.vimeo.com
  https://*.google.com
"
```

## Upgrading from the old hardcoded CSP

If your deployment was relying on the previous hardcoded defaults, set these
env vars to preserve exactly the old behaviour:

```bash
CSP_EXTRA_SCRIPT_SRC="https://cdn.tiny.cloud"
CSP_EXTRA_STYLE_SRC="https://fonts.googleapis.com"
CSP_EXTRA_FONT_SRC="https://fonts.gstatic.com"
CSP_EXTRA_CONNECT_SRC="https://api.openai.com"
CSP_EXTRA_FRAME_SRC="https://www.youtube.com https://player.vimeo.com https://*.google.com"
```

## Testing CSP changes locally

```bash
# Start the dev server with your target CSP config
CSP_EXTRA_FRAME_SRC="https://www.youtube.com" npm run dev

# Open DevTools → Network → pick a document response → check the
# `content-security-policy` response header.
```

You can also run the unit tests in `lib/security/__tests__/csp.test.ts`
to verify env-var parsing and Supabase origin derivation.
