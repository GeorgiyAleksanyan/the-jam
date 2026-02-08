import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { remark } from 'remark';
import html from 'remark-html';

const DOCS_DIR = path.join(process.cwd(), 'content/docs');

export interface DocMeta {
  slug: string;
  title: string;
  description?: string;
  order?: number;
}

export interface Doc extends DocMeta {
  content: string;
  htmlContent?: string;
}

export function getDocSlugs(): string[] {
  if (!fs.existsSync(DOCS_DIR)) {
    return [];
  }
  
  return fs.readdirSync(DOCS_DIR)
    .filter(file => file.endsWith('.mdx') || file.endsWith('.md'))
    .map(file => file.replace(/\.mdx?$/, ''))
    .map(slug => slug === 'index' ? '' : slug);
}

export function getDocBySlug(slug: string): Doc | null {
  // Try .mdx first, then .md
  const mdxPath = path.join(DOCS_DIR, slug === '' ? 'index.mdx' : `${slug}.mdx`);
  const mdPath = path.join(DOCS_DIR, slug === '' ? 'index.md' : `${slug}.md`);
  
  const filePath = fs.existsSync(mdxPath) ? mdxPath : fs.existsSync(mdPath) ? mdPath : null;
  
  if (!filePath) {
    return null;
  }
  
  const fileContents = fs.readFileSync(filePath, 'utf8');
  const { data, content } = matter(fileContents);
  
  return {
    slug,
    title: data.title || slug || 'Introduction',
    description: data.description,
    order: data.order,
    content,
  };
}

export async function getDocWithHtml(slug: string): Promise<Doc | null> {
  const doc = getDocBySlug(slug);
  if (!doc) return null;
  
  const processedContent = await remark()
    .use(html, { sanitize: false })
    .process(doc.content);
  
  return {
    ...doc,
    htmlContent: processedContent.toString(),
  };
}

export function getAllDocs(): DocMeta[] {
  const slugs = getDocSlugs();
  
  const docs = slugs.map(slug => {
    const doc = getDocBySlug(slug);
    if (!doc) return null;
    return {
      slug: doc.slug,
      title: doc.title,
      description: doc.description,
      order: doc.order,
    };
  }).filter(Boolean) as DocMeta[];
  
  // Sort by order, then alphabetically
  return docs.sort((a, b) => {
    const orderA = a.order ?? 999;
    const orderB = b.order ?? 999;
    if (orderA !== orderB) return orderA - orderB;
    return a.title.localeCompare(b.title);
  });
}

export const docsNav = [
  { slug: '', title: 'Introduction' },
  { slug: 'getting-started', title: 'Getting Started' },
  { slug: 'mcp', title: 'MCP Integration' },
  { slug: 'api', title: 'API Reference' },
  { slug: 'challenges', title: 'Challenges' },
];
