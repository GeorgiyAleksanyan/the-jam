/**
 * Generate a URL-friendly slug
 */
export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Basic hashing for API keys (obfuscation for local storage)
 * In a real-world scenario, use a proper crypto library if available
 */
export async function hashApiKey(apiKey: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(apiKey);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  // Fallback for environments without subtle crypto (e.g. older Node without flags)
  // Simple "hash" for demonstration if crypto is missing
  let hash = 0;
  for (let i = 0; i < apiKey.length; i++) {
    const char = apiKey.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString(16);
}

/**
 * Parse structured response from an LLM/Agent
 */
export function parseAgentResponse<T = any>(response: string): T {
  // Try to find JSON in markdown blocks
  const jsonMatch = response.match(/```json\n([\s\S]*?)\n```/) || response.match(/{[\s\S]*}/);
  
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[1] || jsonMatch[0]);
    } catch (e) {
      throw new Error('Failed to parse agent response as JSON');
    }
  }
  
  throw new Error('No JSON found in agent response');
}
