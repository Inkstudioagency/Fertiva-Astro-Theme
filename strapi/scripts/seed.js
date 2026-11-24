'use strict';

/**
 * Seeds the Fertiva demo content (services, doctors, articles + media).
 *
 *   npm run seed            # only seeds an empty database
 *   npm run seed -- --force # deletes existing Fertiva entries first
 *
 * Data lives in `data/seed.json`, images in `data/uploads/`.
 * The script also grants the Public role read access (find / findOne) to the three
 * content types so the Astro frontend can fetch published content without a token.
 */

const fs = require('fs');
const path = require('path');
const { createStrapi, compileStrapi } = require('@strapi/strapi');

const DATA_DIR = path.join(__dirname, '..', 'data');
const seed = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'seed.json'), 'utf8'));
const FORCE = process.argv.includes('--force');

const UIDS = {
  service: 'api::service.service',
  doctor: 'api::doctor.doctor',
  article: 'api::article.article',
};

const MIME = { '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.avif': 'image/avif' };

async function uploadMedia(strapi) {
  const uploaded = {};
  for (const [fileName, info] of Object.entries(seed.media)) {
    const filepath = path.join(DATA_DIR, 'uploads', fileName);
    const name = path.parse(fileName).name;
    const existing = await strapi.query('plugin::upload.file').findOne({ where: { name } });
    if (existing) {
      uploaded[fileName] = existing;
      continue;
    }
    const [file] = await strapi
      .plugin('upload')
      .service('upload')
      .upload({
        files: {
          filepath,
          originalFilename: fileName,
          originalFileName: fileName,
          mimetype: MIME[path.extname(fileName).toLowerCase()] || 'application/octet-stream',
          size: fs.statSync(filepath).size,
        },
        data: { fileInfo: { name, alternativeText: info.alternativeText || '', caption: '' } },
      });
    uploaded[fileName] = file;
  }
  return uploaded;
}

/** Replaces `{ "__file": "name.webp" }` placeholders inside Blocks image nodes with uploaded media. */
function resolveBlocks(blocks, media) {
  return (blocks || []).map((block) => {
    if (block.type === 'image' && block.image && block.image.__file) {
      const file = media[block.image.__file];
      const { id, documentId, name, alternativeText, caption, width, height, formats, hash, ext, mime, size, url, previewUrl, provider, createdAt, updatedAt } = file;
      return {
        ...block,
        image: { id, documentId, name, alternativeText, caption, width, height, formats, hash, ext, mime, size, url, previewUrl, provider, createdAt, updatedAt },
      };
    }
    return block;
  });
}

async function grantPublicRead(strapi) {
  const role = await strapi.query('plugin::users-permissions.role').findOne({ where: { type: 'public' } });
  for (const uid of Object.values(UIDS)) {
    for (const action of ['find', 'findOne']) {
      const name = `${uid}.${action}`;
      const exists = await strapi.query('plugin::users-permissions.permission').findOne({ where: { action: name, role: role.id } });
      if (!exists) {
        await strapi.query('plugin::users-permissions.permission').create({ data: { action: name, role: role.id } });
      }
    }
  }
}

async function clear(strapi) {
  for (const uid of [UIDS.article, UIDS.doctor, UIDS.service]) {
    const docs = await strapi.documents(uid).findMany({ status: 'draft', fields: ['documentId'] });
    for (const doc of docs) await strapi.documents(uid).delete({ documentId: doc.documentId });
  }
}

async function run(strapi) {
  const count = await strapi.documents(UIDS.doctor).count({});
  if (count > 0 && !FORCE) {
    console.log('Content already exists — skipping. Run `npm run seed -- --force` to re-create it.');
    await grantPublicRead(strapi);
    return;
  }
  if (FORCE) await clear(strapi);

  console.log('Uploading media…');
  const media = await uploadMedia(strapi);
  const id = (file) => (file ? media[file].id : null);

  console.log(`Creating ${seed.services.length} services…`);
  for (const s of seed.services) {
    await strapi.documents(UIDS.service).create({
      status: 'published',
      data: {
        ...s,
        image: id(s.image),
        gallery: s.gallery.map(id),
        overview: resolveBlocks(s.overview, media),
        cost: resolveBlocks(s.cost, media),
        closing: resolveBlocks(s.closing, media),
      },
    });
  }

  console.log(`Creating ${seed.doctors.length} doctors…`);
  const doctorIds = {};
  for (const d of seed.doctors) {
    const doc = await strapi.documents(UIDS.doctor).create({
      status: 'published',
      data: { ...d, photo: id(d.photo), about: resolveBlocks(d.about, media) },
    });
    doctorIds[d.slug] = doc.documentId;
  }

  console.log(`Creating ${seed.articles.length} articles…`);
  for (const a of seed.articles) {
    await strapi.documents(UIDS.article).create({
      status: 'published',
      data: { ...a, thumbnail: id(a.thumbnail), body: resolveBlocks(a.body, media), author: doctorIds[a.author] },
    });
  }

  await grantPublicRead(strapi);
  console.log('Seed complete.');
}

async function main() {
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();
  app.log.level = 'error';
  try {
    await run(app);
  } finally {
    await app.destroy();
  }
}

main().catch((error) => {
  console.error(error);
  if (error.details) console.error(JSON.stringify(error.details, null, 2));
  process.exit(1);
});
