/**
 * CMS data layer: fetches the three Strapi collections (services, doctors, articles)
 * and normalises them into the view models used by the components.
 * Results are memoised for the duration of a build.
 */
import { fetchAll, mediaUrl, type StrapiMedia } from './strapi';
import queries from './cms-queries.json';
import type { BlocksContent } from './blocks';

// ---------------------------------------------------------------------------
// View models
// ---------------------------------------------------------------------------

export interface CmsImage {
  src: string;
  srcset?: string;
  alt: string;
  width?: number;
  height?: number;
}

export interface Seo {
  title?: string;
  description?: string;
}

export interface Service {
  slug: string;
  url: string;
  name: string;
  number: string;
  summary: string;
  image: CmsImage;
  features: string[];
  overview: BlocksContent;
  cardsHeading: string;
  cards: { title: string; description: string }[];
  cost: BlocksContent;
  gallery: CmsImage[];
  closing: BlocksContent;
  quote: string;
  quoteAuthor: string;
  tags: string[];
  seo: Seo;
}

export interface Doctor {
  slug: string;
  url: string;
  name: string;
  order: number;
  category: string;
  specialtyTitle: string;
  photo: CmsImage;
  experience: string;
  dutyTime: string;
  surgeries: string;
  availability: string;
  about: BlocksContent;
  stats: { value: string; label: string }[];
  phone: string;
  phoneHref: string;
  email: string;
  clinicAddress: string;
  weekdayHours: string;
  saturdayHours: string;
  sundayHours: string;
  consultationFee: string;
  expertise: string[];
  timeline: { years: string; title: string; description: string }[];
  seo: Seo;
}

export interface Article {
  slug: string;
  url: string;
  title: string;
  category: string;
  thumbnail: CmsImage;
  publishDate: string;
  summary: string;
  body: BlocksContent;
  readTime: string;
  author: { name: string; photo: CmsImage; url: string } | null;
  seo: Seo;
}

// ---------------------------------------------------------------------------
// Raw Strapi shapes (only the fields we read)
// ---------------------------------------------------------------------------

interface RawSeo {
  metaTitle?: string | null;
  metaDescription?: string | null;
}
type RawText = { text: string };

interface RawService {
  name: string;
  slug: string;
  number: string;
  summary: string;
  image: StrapiMedia | null;
  features?: RawText[];
  overview?: BlocksContent | null;
  cardsHeading?: string | null;
  cards?: { title: string; description?: string | null }[];
  cost?: BlocksContent | null;
  gallery?: StrapiMedia[] | null;
  closing?: BlocksContent | null;
  quote?: string | null;
  quoteAuthor?: string | null;
  tags?: RawText[];
  seo?: RawSeo | null;
}

interface RawDoctor {
  name: string;
  slug: string;
  order?: number | null;
  category: string;
  specialtyTitle?: string | null;
  photo: StrapiMedia | null;
  experience?: string | null;
  dutyTime?: string | null;
  surgeries?: string | null;
  availability?: string | null;
  about?: BlocksContent | null;
  stats?: { value: string; label: string }[];
  phone?: string | null;
  email?: string | null;
  clinicAddress?: string | null;
  weekdayHours?: string | null;
  saturdayHours?: string | null;
  sundayHours?: string | null;
  consultationFee?: string | null;
  expertise?: RawText[];
  timeline?: { years: string; title: string; description?: string | null }[];
  seo?: RawSeo | null;
}

interface RawArticle {
  title: string;
  slug: string;
  category: string;
  thumbnail: StrapiMedia | null;
  publishDate: string;
  summary?: string | null;
  body?: BlocksContent | null;
  readTime?: string | null;
  author?: { name: string; slug: string; photo: StrapiMedia | null } | null;
  seo?: RawSeo | null;
}

// ---------------------------------------------------------------------------
// Normalisers
// ---------------------------------------------------------------------------

/** Builds an <img> model with a srcset from Strapi's responsive formats. */
export function toImage(media: StrapiMedia | null | undefined, fallbackAlt = ''): CmsImage {
  if (!media) return { src: '', alt: fallbackAlt };
  const candidates = Object.values(media.formats ?? {})
    .filter((f) => f && f.width && f.width > 200)
    .map((f) => ({ url: mediaUrl(f.url), width: f.width }));
  if (media.width) candidates.push({ url: mediaUrl(media.url), width: media.width });
  const srcset = candidates
    .sort((a, b) => a.width - b.width)
    .filter((c, i, arr) => arr.findIndex((x) => x.width === c.width) === i)
    .map((c) => `${c.url} ${c.width}w`)
    .join(', ');
  return {
    src: mediaUrl(media.url),
    srcset: candidates.length > 1 ? srcset : undefined,
    alt: media.alternativeText || fallbackAlt,
    width: media.width ?? undefined,
    height: media.height ?? undefined,
  };
}

const seo = (raw?: RawSeo | null): Seo => ({ title: raw?.metaTitle ?? undefined, description: raw?.metaDescription ?? undefined });
const texts = (items?: RawText[]) => (items ?? []).map((i) => i.text);

function toService(s: RawService): Service {
  return {
    slug: s.slug,
    url: `/service/${s.slug}`,
    name: s.name,
    number: s.number,
    summary: s.summary,
    image: toImage(s.image, s.name),
    features: texts(s.features),
    overview: s.overview ?? [],
    cardsHeading: s.cardsHeading ?? '',
    cards: (s.cards ?? []).map((c) => ({ title: c.title, description: c.description ?? '' })),
    cost: s.cost ?? [],
    gallery: (s.gallery ?? []).map((g) => toImage(g, s.name)),
    closing: s.closing ?? [],
    quote: s.quote ?? '',
    quoteAuthor: s.quoteAuthor ?? '',
    tags: texts(s.tags),
    seo: seo(s.seo),
  };
}

function toDoctor(d: RawDoctor): Doctor {
  const phone = d.phone ?? '';
  return {
    slug: d.slug,
    url: `/doctor/${d.slug}`,
    name: d.name,
    order: d.order ?? 0,
    category: d.category,
    specialtyTitle: d.specialtyTitle ?? '',
    photo: toImage(d.photo, d.name),
    experience: d.experience ?? '',
    dutyTime: d.dutyTime ?? '',
    surgeries: d.surgeries ?? '',
    availability: d.availability ?? '',
    about: d.about ?? [],
    stats: d.stats ?? [],
    phone,
    phoneHref: phone ? `tel:${phone.replace(/[^\d+]/g, '')}` : '',
    email: d.email ?? '',
    clinicAddress: d.clinicAddress ?? '',
    weekdayHours: d.weekdayHours ?? '',
    saturdayHours: d.saturdayHours ?? '',
    sundayHours: d.sundayHours ?? '',
    consultationFee: d.consultationFee ?? '',
    expertise: texts(d.expertise),
    timeline: (d.timeline ?? []).map((t) => ({ years: t.years, title: t.title, description: t.description ?? '' })),
    seo: seo(d.seo),
  };
}

function toArticle(a: RawArticle): Article {
  return {
    slug: a.slug,
    url: `/blog/${a.slug}`,
    title: a.title,
    category: a.category,
    thumbnail: toImage(a.thumbnail, a.title),
    publishDate: a.publishDate,
    summary: a.summary ?? '',
    body: a.body ?? [],
    readTime: a.readTime ?? '',
    author: a.author
      ? {
          name: `Dr. ${a.author.name}`,
          photo: { ...toImage(a.author.photo), alt: `Dr. ${a.author.name}` },
          url: `/doctor/${a.author.slug}`,
        }
      : null,
    seo: seo(a.seo),
  };
}

// ---------------------------------------------------------------------------
// Queries (memoised per build)
// ---------------------------------------------------------------------------

const cache = new Map<string, Promise<unknown>>();
function memo<T>(key: string, load: () => Promise<T>): Promise<T> {
  if (!cache.has(key)) cache.set(key, load());
  return cache.get(key) as Promise<T>;
}

/** All services, ordered by their number (01, 02, …). */
export function getServices(): Promise<Service[]> {
  return memo('services', async () => {
    const raw = await fetchAll<RawService>('services', queries.services);
    return raw.map(toService);
  });
}

/** All doctors, in their display order. */
export function getDoctors(): Promise<Doctor[]> {
  return memo('doctors', async () => {
    const raw = await fetchAll<RawDoctor>('doctors', queries.doctors);
    return raw.map(toDoctor);
  });
}

/** All articles, newest first. */
export function getArticles(): Promise<Article[]> {
  return memo('articles', async () => {
    const raw = await fetchAll<RawArticle>('articles', queries.articles);
    return raw.map(toArticle);
  });
}

/** Doctor categories in the order they first appear (used for the doctor tabs). */
export async function getDoctorCategories(): Promise<string[]> {
  const doctors = await getDoctors();
  return [...new Set(doctors.map((d) => d.category))];
}
