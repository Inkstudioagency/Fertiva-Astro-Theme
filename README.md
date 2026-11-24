# Fertiva — Astro theme for women's health & fertility clinics

Fertiva is a calm, image-led Astro theme for fertility, pregnancy and women's health clinics. It comes with three home pages, three about pages, three contact pages, services, doctors, a blog, and utility pages, plus a ready-to-use **Strapi** CMS for services, doctors and articles.

- **Astro 7**, fully static output: deploys to any static host
- **Strapi 5 CMS** included (`/strapi`), with seed data and the Strapi MCP server enabled
- **Builds without a CMS** too: a content snapshot is bundled, so `npm run dev` works right after cloning
- Responsive at every breakpoint, with scroll and reveal animations, sliders, tabs, an FAQ accordion, background videos and Lottie
- Per-page SEO (title, description, canonical, Open Graph, Twitter cards) and an XML sitemap
- Type-checked with `astro check`

## Pages

| Route | Page |
| --- | --- |
| `/`, `/home-v2`, `/home-v3` | Home pages |
| `/about-us-v1`, `/about-us-v2`, `/about-us-v3` | About pages |
| `/contact-v1`, `/contact-v2`, `/contact-v3` | Contact pages |
| `/services`, `/service/[slug]` | Services and service detail (CMS) |
| `/doctors`, `/doctor/[slug]` | Doctors and doctor profile (CMS) |
| `/blog`, `/blog/[slug]` | Blog and article (CMS) |
| `/style-guide`, `/licenses`, `/changelog`, `/instructions`, `/401`, `/404` | Utility pages |

## Quick start

Requires Node.js 22.23.4 or newer.

```bash
npm install
npm run dev        # http://localhost:4321, using the bundled content snapshot
```

### With the Strapi CMS

```bash
cd strapi
cp .env.example .env    # replace every "tobemodified" value with a random secret
npm install
npm run seed            # demo services, doctors and articles
npm run develop         # admin at http://localhost:1337/admin

cd ..
cp .env.example .env    # STRAPI_URL=http://localhost:1337
npm run dev
```

When `STRAPI_URL` is set, pages are built from Strapi. When it isn't, they're built from `src/data/cms-snapshot.json`. To refresh the bundled snapshot from your Strapi content, run `npm run snapshot`.

## Commands

| Command | Action |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build the static site into `dist/` |
| `npm run preview` | Preview the production build |
| `npm run snapshot` | Save the current Strapi content into `src/data/cms-snapshot.json` + `public/cms-media/` |

## Environment

| Variable | Purpose |
| --- | --- |
| `SITE_URL` | Public site URL (canonical, Open Graph, sitemap) |
| `STRAPI_URL` | Strapi base URL. Leave unset to build from the bundled snapshot |
| `STRAPI_TOKEN` | Optional read-only API token, only needed if the Public role can't read the collections |

## Project structure

```text
├── public/            images, videos, fonts, Lottie files, CMS snapshot media, site scripts
├── src/
│   ├── config/        site.json (name, SEO defaults, credits), menu.json (navbar, dropdown, footer, social)
│   ├── data/          cms-snapshot.json (bundled CMS content)
│   ├── layouts/       BaseLayout.astro: <head>, SEO, fonts, styles, scripts
│   ├── lib/           Strapi client, CMS queries and view models, rich-text renderer, helpers
│   ├── components/
│   │   ├── global/    Navbar, Footer, SeoMeta, SiteScripts
│   │   ├── ui/        PrimaryButton (all button variants), SocialIcon, ServiceIcon
│   │   └── sections/  one component per page section, grouped by page
│   ├── pages/         routes, including blog/[slug], doctor/[slug], service/[slug]
│   └── styles/        theme CSS
├── scripts/           snapshot.mjs
└── strapi/            Strapi 5 CMS (content types, seed data, MCP server); see strapi/README.md
```

## Customising

- **Services, doctors, articles:** edit them in Strapi, then rebuild. A Strapi webhook can trigger your host's deploy hook.
- **Navigation, footer and social links:** `src/config/menu.json`.
- **Site name, SEO defaults, credits:** `src/config/site.json`.
- **Page copy:** the section components in `src/components/sections`.
- **Buttons:** `<PrimaryButton href label variant />`, with variants `base`, `primary-border`, `with-border`, `white`, `secondary` and `transparent`.
- **Forms:** set each form's `action` to your form backend (Formspree, Netlify Forms, your own endpoint). Without an `action`, a form is a demo: nothing is sent and its success message is shown.
- **Animations:** see the `/instructions` page. The reveal, slider and tab interactions run from `public/js/site.js` and rely on the existing class names and each page's `wfPage` id, so keep those unchanged.

The password page (`/401`) is a design only: a static site can't check passwords, so submitting it just shows the error state. To protect pages, use your host's password protection. The page is `noindex` and excluded from the sitemap.

## Deploying

`npm run build` produces a static site in `dist/` that runs on Vercel, Netlify, Cloudflare Pages or any static host. Set `SITE_URL` on the host. Set `STRAPI_URL` only if the build should read a live Strapi instance.

## License

MIT, see [LICENSE](LICENSE).

## Credits

Designed and developed by [Ink Studio](https://inks.studio). Fonts, images and icons are listed on the `/licenses` page.
