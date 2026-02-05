import { NextRequest, NextResponse } from 'next/server';

const GITHUB_GRAPHQL = 'https://api.github.com/graphql';
const REPO_OWNER = 'GeorgiyAleksanyan';
const REPO_NAME = 'the-jam';

async function fetchDiscussions(options: {
  category?: string;
  limit?: number;
}) {
  const token = process.env.GITHUB_TOKEN;
  
  if (!token) {
    // Return placeholder data if no token
    return [{
      id: 'placeholder',
      title: 'GitHub token required for discussions',
      category: 'general',
      url: `https://github.com/${REPO_OWNER}/${REPO_NAME}/discussions`,
      message: 'Set GITHUB_TOKEN to fetch real discussions',
    }];
  }

  const query = `
    query($owner: String!, $name: String!, $first: Int!) {
      repository(owner: $owner, name: $name) {
        discussions(first: $first, orderBy: {field: CREATED_AT, direction: DESC}) {
          nodes {
            id
            number
            title
            bodyText
            createdAt
            updatedAt
            url
            author {
              login
            }
            category {
              name
              slug
            }
            comments {
              totalCount
            }
            upvoteCount
          }
        }
      }
    }
  `;

  const response = await fetch(GITHUB_GRAPHQL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables: {
        owner: REPO_OWNER,
        name: REPO_NAME,
        first: options.limit || 10,
      },
    }),
  });

  if (!response.ok) {
    throw new Error(`GitHub GraphQL error: ${response.status}`);
  }

  const data = await response.json();
  
  if (data.errors) {
    throw new Error(data.errors[0]?.message || 'GraphQL error');
  }

  const discussions = data.data?.repository?.discussions?.nodes || [];
  
  // Filter by category if specified
  let filtered = discussions;
  if (options.category) {
    filtered = discussions.filter((d: any) => 
      d.category?.slug === options.category || d.category?.name === options.category
    );
  }

  return filtered.map((d: any) => ({
    id: d.id,
    number: d.number,
    title: d.title,
    body_preview: d.bodyText?.substring(0, 300) || '',
    created_at: d.createdAt,
    updated_at: d.updatedAt,
    url: d.url,
    author: d.author?.login,
    category: d.category?.name,
    category_slug: d.category?.slug,
    comments: d.comments?.totalCount || 0,
    upvotes: d.upvoteCount || 0,
  }));
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') || undefined;
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const discussions = await fetchDiscussions({ category, limit });

    return NextResponse.json({ discussions });
  } catch (error: any) {
    console.error('GitHub discussions fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch discussions: ' + error.message },
      { status: 500 }
    );
  }
}
