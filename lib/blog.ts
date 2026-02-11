import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const BLOG_DIR = path.join(process.cwd(), 'content/blog');

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;
  author: string;
  authorImage?: string;
  authorTwitter?: string;
  image?: string;
  tags: string[];
  category: string;
  featured: boolean;
  draft: boolean;
  readingTime: number;
  content: string;
}

export interface BlogPostMeta extends Omit<BlogPost, 'content'> {}

function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.trim().split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}

export function getAllPosts(): BlogPostMeta[] {
  if (!fs.existsSync(BLOG_DIR)) {
    return [];
  }

  const files = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.mdx') || f.endsWith('.md'));
  
  const posts = files.map(filename => {
    const slug = filename.replace(/\.(mdx|md)$/, '');
    const filePath = path.join(BLOG_DIR, filename);
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const { data, content } = matter(fileContent);
    
    return {
      slug,
      title: data.title || slug,
      description: data.description || '',
      date: data.date || new Date().toISOString(),
      author: data.author || 'The Jam Team',
      authorImage: data.authorImage,
      authorTwitter: data.authorTwitter,
      image: data.image,
      tags: data.tags || [],
      category: data.category || 'General',
      featured: data.featured || false,
      draft: data.draft || false,
      readingTime: calculateReadingTime(content),
    };
  });

  // Filter out drafts in production, sort by date
  return posts
    .filter(post => process.env.NODE_ENV === 'development' || !post.draft)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getPostBySlug(slug: string): BlogPost | null {
  const mdxPath = path.join(BLOG_DIR, `${slug}.mdx`);
  const mdPath = path.join(BLOG_DIR, `${slug}.md`);
  
  let filePath = '';
  if (fs.existsSync(mdxPath)) {
    filePath = mdxPath;
  } else if (fs.existsSync(mdPath)) {
    filePath = mdPath;
  } else {
    return null;
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(fileContent);

  return {
    slug,
    title: data.title || slug,
    description: data.description || '',
    date: data.date || new Date().toISOString(),
    author: data.author || 'The Jam Team',
    authorImage: data.authorImage,
    authorTwitter: data.authorTwitter,
    image: data.image,
    tags: data.tags || [],
    category: data.category || 'General',
    featured: data.featured || false,
    draft: data.draft || false,
    readingTime: calculateReadingTime(content),
    content,
  };
}

export function getFeaturedPosts(limit = 3): BlogPostMeta[] {
  return getAllPosts().filter(post => post.featured).slice(0, limit);
}

export function getPostsByCategory(category: string): BlogPostMeta[] {
  return getAllPosts().filter(post => post.category.toLowerCase() === category.toLowerCase());
}

export function getPostsByTag(tag: string): BlogPostMeta[] {
  return getAllPosts().filter(post => 
    post.tags.some(t => t.toLowerCase() === tag.toLowerCase())
  );
}

export function getAllTags(): { tag: string; count: number }[] {
  const posts = getAllPosts();
  const tagCounts: Record<string, number> = {};
  
  posts.forEach(post => {
    post.tags.forEach(tag => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  return Object.entries(tagCounts)
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count);
}

export function getAllCategories(): { category: string; count: number }[] {
  const posts = getAllPosts();
  const categoryCounts: Record<string, number> = {};
  
  posts.forEach(post => {
    categoryCounts[post.category] = (categoryCounts[post.category] || 0) + 1;
  });

  return Object.entries(categoryCounts)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count);
}

export function getRelatedPosts(currentSlug: string, limit = 3): BlogPostMeta[] {
  const currentPost = getPostBySlug(currentSlug);
  if (!currentPost) return [];

  const allPosts = getAllPosts().filter(p => p.slug !== currentSlug);
  
  // Score posts by tag/category overlap
  const scored = allPosts.map(post => {
    let score = 0;
    if (post.category === currentPost.category) score += 2;
    post.tags.forEach(tag => {
      if (currentPost.tags.includes(tag)) score += 1;
    });
    return { post, score };
  });

  return scored
    .filter(s => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(s => s.post);
}

export function searchPosts(query: string): BlogPostMeta[] {
  const q = query.toLowerCase();
  return getAllPosts().filter(post =>
    post.title.toLowerCase().includes(q) ||
    post.description.toLowerCase().includes(q) ||
    post.tags.some(t => t.toLowerCase().includes(q)) ||
    post.category.toLowerCase().includes(q)
  );
}
