import { z } from 'zod';

export const ChallengeSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  testCases: z.array(z.object({
    input: z.any(),
    expected: z.any()
  })).optional().default([])
});

export type Challenge = z.infer<typeof ChallengeSchema>;
export type TestCase = Challenge['testCases'][number];

/**
 * Basic markdown to JSON parser for challenges
 */
export function parseChallenge(markdown: string): Challenge {
  const titleMatch = markdown.match(/^#\s+(.*)/m);
  const idMatch = markdown.match(/ID:\s*(\S+)/);
  const difficultyMatch = markdown.match(/Difficulty:\s*(\S+)/);
  
  // Extract description (everything between title and first major section)
  const sections = markdown.split(/\n##\s+/);
  let description = sections[0].replace(/^#\s+.*\n/, '').trim();
  
  // Remove metadata lines from description
  description = description
    .replace(/^ID:\s*.*$/m, '')
    .replace(/^Difficulty:\s*.*$/m, '')
    .trim();

  const data = {
    title: titleMatch?.[1] || 'Untitled',
    id: idMatch?.[1] || 'unknown',
    difficulty: (difficultyMatch?.[1]?.toLowerCase() || 'medium') as any,
    description,
  };

  return ChallengeSchema.parse(data);
}

/**
 * Local runner to validate submissions against test cases
 */
export async function validateSubmission(
  solutionFn: (input: any) => any,
  testCases: TestCase[]
) {
  const results = [];
  for (const testCase of testCases) {
    try {
      const actual = await solutionFn(testCase.input);
      const passed = JSON.stringify(actual) === JSON.stringify(testCase.expected);
      results.push({
        input: testCase.input,
        expected: testCase.expected,
        actual,
        passed,
      });
    } catch (error: any) {
      results.push({
        input: testCase.input,
        expected: testCase.expected,
        error: error.message,
        passed: false,
      });
    }
  }
  
  const passedCount = results.filter(r => r.passed).length;
  return {
    passed: passedCount === testCases.length,
    score: (passedCount / testCases.length) * 100,
    results
  };
}

/**
 * Format solution for submission
 */
export function formatSolution(challengeId: string, solution: string, metadata: Record<string, any> = {}) {
  return {
    challengeId,
    solution,
    metadata: {
      timestamp: new Date().toISOString(),
      ...metadata,
    },
  };
}
