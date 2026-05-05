# patente-digitale-web

Landing page and web app for [patentedigitale.it](https://patentedigitale.it) — the digital driving licence quiz platform for Italy.

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 19 + TypeScript |
| Build | Vite 8 |
| Styling | Tailwind CSS v4 |
| UI components | shadcn/ui + Base UI |
| Animations | Framer Motion |
| i18n | i18next (IT / EN) |
| Linter/Formatter | Biome |
| Package manager | pnpm |

## Local development

```bash
pnpm install
pnpm dev
```

Build for production:

```bash
pnpm build
pnpm preview
```

## Project structure

```
src/
  components/
    brand/       # Logo, brand assets
    layout/      # Footer, placeholders, eyebrow labels
    motion/      # Framer Motion wrappers
    nav/         # Navbar, language switcher
    sections/    # Landing page sections (Hero, FAQ, B2B, …)
    ui/          # shadcn/ui primitives
  i18n/
    locales/     # en.json, it.json
  routes/        # Page-level components (Landing, Accedi, Cerca, …)
  styles/        # Tailwind entry, design tokens
```

## Deployment

Hosted on **Vercel** with GitHub integration — every push to `main` triggers a production deploy.

- **Production URL**: https://patentedigitale.it
- **Vercel alias**: https://patente-digitale-web.vercel.app
- **GitHub repo**: https://github.com/W3sley0Bi/patente-digitale-web
- **Vercel project**: https://vercel.com/w3sley0bis-projects/patente-digitale-web

### Custom domain DNS (Aruba)

| Type | Name | Value |
|------|------|-------|
| `A` | `@` | `216.198.79.1` |
| `CNAME` | `www` | `da83483ca8cbe6c2.vercel-dns-017.com` |

SSL is provisioned automatically by Vercel once DNS resolves.
