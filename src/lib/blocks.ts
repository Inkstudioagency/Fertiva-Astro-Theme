/**
 * Renders Strapi "Blocks" rich text to HTML using the same markup as Webflow's rich text
 * element, so the original `.w-richtext` styles apply unchanged.
 */
import { mediaUrl, type StrapiMedia } from './strapi';

type TextNode = {
  type: 'text';
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
};
type LinkNode = { type: 'link'; url: string; children: InlineNode[] };
type InlineNode = TextNode | LinkNode;
type ListItemNode = { type: 'list-item'; children: InlineNode[] };

export type Block =
  | { type: 'paragraph'; children: InlineNode[] }
  | { type: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6; children: InlineNode[] }
  | { type: 'quote'; children: InlineNode[] }
  | { type: 'code'; children: InlineNode[] }
  | { type: 'list'; format: 'ordered' | 'unordered'; children: (ListItemNode | Extract<Block, { type: 'list' }>)[] }
  | { type: 'image'; image: StrapiMedia & { name?: string }; children: InlineNode[] };

export type BlocksContent = Block[];

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function inline(nodes: InlineNode[] = []): string {
  return nodes
    .map((node) => {
      if (node.type === 'link') {
        const external = /^https?:\/\//.test(node.url);
        return `<a href="${escapeHtml(node.url)}"${external ? ' target="_blank" rel="noopener"' : ''}>${inline(node.children)}</a>`;
      }
      let html = escapeHtml(node.text).replace(/\n/g, '<br>');
      if (node.code) html = `<code>${html}</code>`;
      if (node.bold) html = `<strong>${html}</strong>`;
      if (node.italic) html = `<em>${html}</em>`;
      if (node.underline) html = `<u>${html}</u>`;
      if (node.strikethrough) html = `<s>${html}</s>`;
      return html;
    })
    .join('');
}

function block(b: Block): string {
  switch (b.type) {
    case 'paragraph':
      return `<p>${inline(b.children)}</p>`;
    case 'heading':
      return `<h${b.level}>${inline(b.children)}</h${b.level}>`;
    case 'quote':
      return `<blockquote>${inline(b.children)}</blockquote>`;
    case 'code':
      return `<pre><code>${inline(b.children)}</code></pre>`;
    case 'list': {
      const tag = b.format === 'ordered' ? 'ol' : 'ul';
      const items = b.children.map((c) => (c.type === 'list-item' ? `<li>${inline(c.children)}</li>` : block(c))).join('');
      return `<${tag} role="list">${items}</${tag}>`;
    }
    case 'image': {
      const img = b.image;
      if (!img?.url) return '';
      const width = img.width ? `${img.width}px` : 'none';
      return (
        `<figure style="max-width:${width}" class="w-richtext-align-fullwidth w-richtext-figure-type-image">` +
        `<div><img alt="${escapeHtml(img.alternativeText ?? '')}" src="${escapeHtml(mediaUrl(img.url))}" loading="lazy"></div></figure>`
      );
    }
    default:
      return '';
  }
}

/** Title + description pair rendered as the rich text Webflow used for cards and timeline entries. */
export function cardHtml(card: { title: string; description?: string } | null | undefined): string {
  if (!card) return '';
  return `<h3>${escapeHtml(card.title)}</h3>${card.description ? `<p>${escapeHtml(card.description)}</p>` : ''}`;
}

export function blocksToHtml(blocks: BlocksContent | null | undefined): string {
  return (blocks ?? []).map(block).join('');
}
