# Fertiva — Strapi CMS

Headless CMS for the Fertiva Astro theme. Strapi 5, SQLite by default.

## Content model

| Collection | Used on | Key fields |
| --- | --- | --- |
| **Service** (`api::service.service`) | Home V1–V3, Services, Doctor page, `/service/[slug]` | name, slug, number, summary, image, features (≤4), overview / cost / closing (Blocks rich text), cards (≤4), gallery, quote, tags (≤4), SEO |
| **Doctor** (`api::doctor.doctor`) | Home V1–V3, Doctors, `/doctor/[slug]` | name, slug, order, category, specialtyTitle, photo, experience, dutyTime, surgeries, about (Blocks), stats (≤3), contact details, hours, fee, expertise (≤6), timeline (≤4), SEO |
| **Article** (`api::article.article`) | Blog sections, `/blog`, `/blog/[slug]` | title, slug, category, thumbnail, publishDate, summary, body (Blocks), readTime, author → Doctor, SEO |

Shared components live in `src/components` (`shared.seo`, `shared.text-item`, `shared.stat`, `shared.card`, `doctor.timeline-entry`).

Doctor **category** drives the doctor tabs on the site: one tab per distinct category, in doctor `order`.

## Getting started

```bash
cp .env.example .env      # then replace every "tobemodified" value with a random secret
npm install
npm run seed              # imports the demo content from data/seed.json (+ data/uploads)
npm run develop           # http://localhost:1337/admin
```

On first start, create your admin account in the browser.

`npm run seed` only seeds an empty database. `npm run seed -- --force` deletes the Fertiva entries and imports them again. The seed also gives the **Public** role `find` / `findOne` on the three collections, so the Astro site can read published content without a token.

## Strapi MCP server

The [Strapi MCP server](https://docs.strapi.io/cms/features/strapi-mcp-server) is enabled in `config/server.ts` (`MCP_ENABLED=true`). AI clients can then list, create, update and publish Services, Doctors and Articles, and browse the Media Library.

1. In the admin go to **Settings → Admin tokens** and create a token. Give it only the permissions the AI client should have (for example Content Manager read/create/update/publish on the three collections, plus Media Library read).
2. Point your MCP client at `http://localhost:1337/mcp` with the header `Authorization: Bearer <admin token>`. For Claude Code:

   ```bash
   claude mcp add --transport http strapi http://localhost:1337/mcp --header "Authorization: Bearer <admin token>"
   ```

3. To check it without an AI client:

   ```bash
   STRAPI_MCP_TOKEN=<admin token> node scripts/mcp-call.js tools/list
   STRAPI_MCP_TOKEN=<admin token> node scripts/mcp-call.js list_doctor '{"pageSize":3}'
   ```

The tools available depend on the token's permissions (`list_service`, `get_service`, `create_service`, `update_service`, `publish_service`, … plus `media_list_assets` and related tools).

## Rebuilding the site after edits

The Astro site is static and reads Strapi at build time. After publishing changes, rebuild the site (`npm run build` in the theme root), or add a Strapi webhook (**Settings → Webhooks**) that triggers your host's deploy hook on entry publish/unpublish.

## Production notes

- Use PostgreSQL or MySQL instead of SQLite (`DATABASE_CLIENT` etc. in `.env`, see `config/database.ts`).
- Use a cloud upload provider (S3, Cloudinary, …) so media URLs are absolute and survive redeploys.
- Set `STRAPI_URL` in the theme's `.env` to the public Strapi URL.
