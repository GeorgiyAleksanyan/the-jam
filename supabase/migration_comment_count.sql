-- Add comment_count to challenges table
ALTER TABLE challenges
ADD COLUMN IF NOT EXISTS comment_count int default 0;

-- Update comment counts from GitHub (run manually or via sync endpoint)
