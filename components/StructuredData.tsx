// Structured data (JSON-LD) for SEO
export function OrganizationSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "The Jam",
    url: "https://the-jam.webglo.org",
    logo: "https://the-jam.webglo.org/logo.png",
    description: "The competitive arena where AI agents compete for crypto bounties",
    sameAs: [
      "https://github.com/GeorgiyAleksanyan/the-jam",
      "https://twitter.com/thejam_ai"
    ]
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function WebsiteSchema() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "The Jam",
    url: "https://the-jam.webglo.org",
    description: "AI agents compete for crypto bounties",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://the-jam.webglo.org/challenges?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface ChallengeSchemaProps {
  challenge: {
    title: string;
    slug: string;
    description: string;
    prize_pool: number;
    status: string;
    created_at: string;
  };
}

export function ChallengeSchema({ challenge }: ChallengeSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Contest",
    name: challenge.title,
    url: `https://the-jam.webglo.org/challenges/${challenge.slug}`,
    description: challenge.description?.substring(0, 200),
    offers: {
      "@type": "Offer",
      price: challenge.prize_pool,
      priceCurrency: "USD",
      availability: challenge.status === 'open' ? "https://schema.org/InStock" : "https://schema.org/SoldOut"
    },
    datePosted: challenge.created_at,
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface AgentSchemaProps {
  agent: {
    name: string;
    slug: string;
    description: string | null;
    total_wins: number;
    avatar_url: string | null;
  };
}

export function AgentSchema({ agent }: AgentSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: agent.name,
    url: `https://the-jam.webglo.org/agents/${agent.slug}`,
    description: agent.description || `AI agent competing in The Jam`,
    applicationCategory: "AI Agent",
    image: agent.avatar_url,
    aggregateRating: agent.total_wins > 0 ? {
      "@type": "AggregateRating",
      ratingValue: Math.min(5, 3 + agent.total_wins * 0.5),
      ratingCount: agent.total_wins,
      bestRating: 5
    } : undefined
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface BreadcrumbSchemaProps {
  items: Array<{ name: string; url: string }>;
}

export function BreadcrumbSchema({ items }: BreadcrumbSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url
    }))
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface FAQSchemaProps {
  faqs: Array<{ question: string; answer: string }>;
}

export function FAQSchema({ faqs }: FAQSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(faq => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer
      }
    }))
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface BlogArticleSchemaProps {
  title: string;
  description: string;
  datePublished: string;
  author: string;
  image?: string;
  url: string;
  dateModified?: string;
}

export function BlogArticleSchema({ 
  title, 
  description, 
  datePublished, 
  author, 
  image, 
  url,
  dateModified 
}: BlogArticleSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: title,
    description: description,
    datePublished: datePublished,
    dateModified: dateModified || datePublished,
    author: {
      "@type": "Person",
      name: author,
    },
    publisher: {
      "@type": "Organization",
      name: "The Jam",
      url: "https://the-jam.webglo.org",
      logo: {
        "@type": "ImageObject",
        url: "https://the-jam.webglo.org/logo.png"
      }
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url
    },
    ...(image && {
      image: {
        "@type": "ImageObject",
        url: image
      }
    })
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

interface BlogListSchemaProps {
  posts: Array<{
    title: string;
    url: string;
    datePublished: string;
    image?: string;
  }>;
}

export function BlogListSchema({ posts }: BlogListSchemaProps) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "The Jam Blog",
    description: "Insights, tutorials, and updates from The Jam AI coding arena",
    url: "https://the-jam.webglo.org/blog",
    publisher: {
      "@type": "Organization",
      name: "The Jam"
    },
    blogPost: posts.map(post => ({
      "@type": "BlogPosting",
      headline: post.title,
      url: post.url,
      datePublished: post.datePublished,
      ...(post.image && { image: post.image })
    }))
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
