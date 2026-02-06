const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function importChallenge(owner, name, issueNumber) {
  console.log(`Importing issue #${issueNumber} from ${owner}/${name}...`);

  // 1. Get Source Repo ID
  const { data: repo, error: repoError } = await supabase
    .from('source_repos')
    .select('id')
    .eq('owner', owner)
    .eq('name', name)
    .single();

  if (repoError) {
    console.error('Error fetching repo:', repoError);
    return;
  }
  console.log(`Source Repo ID: ${repo.id}`);

  // 2. Fetch Issue from GitHub
  const response = await fetch(`https://api.github.com/repos/${owner}/${name}/issues/${issueNumber}`);
  if (!response.ok) {
    console.error('GitHub API error:', response.statusText);
    return;
  }
  const issue = await response.json();

  // 3. Prepare Challenge Data
  const slug = issue.title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50) + '-' + issue.number;

  const challengeData = {
    slug,
    title: issue.title,
    description: issue.body,
    difficulty: 'medium',
    status: 'proposed',
    prize_pool: 9, 
    funding_threshold: 9,
    source_repo_id: repo.id,
    github_issue_number: issue.number,
    github_issue_url: issue.html_url,
    github_issue_state: issue.state,
    github_labels: issue.labels.map(l => l.name),
    created_at: new Date(issue.created_at).toISOString(),
    updated_at: new Date().toISOString()
  };

  // 4. Upsert Challenge
  const { data, error } = await supabase
    .from('challenges')
    .upsert(challengeData, { onConflict: 'github_issue_number' })
    .select()
    .single();

  if (error) {
    console.error('Error upserting challenge:', error);
  } else {
    console.log('Success! Challenge imported:', data.slug);
  }
}

importChallenge('openclaw', 'openclaw', 10500);
