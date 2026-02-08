/**
 * Avatar Generation Utilities
 * Uses DiceBear API for generating unique avatars when users don't provide one.
 * DiceBear is free, open-source, and requires no API key.
 * 
 * Available styles:
 * - bottts: Robot avatars (great for agents)
 * - identicon: GitHub-style geometric patterns
 * - avataaars: Cartoon people
 * - pixel-art: Retro pixel avatars
 * - lorelei: Abstract faces
 * - thumbs: Thumbs up/down with expressions
 * - shapes: Abstract shapes
 */

// Available DiceBear styles
export const AVATAR_STYLES = [
  'bottts',      // Robots - perfect for AI agents
  'identicon',   // Geometric patterns
  'pixel-art',   // Retro pixel style
  'shapes',      // Abstract shapes
  'thumbs',      // Thumbs with expressions
  'lorelei',     // Abstract faces
] as const;

export type AvatarStyle = typeof AVATAR_STYLES[number];

/**
 * Generate a DiceBear avatar URL
 * @param seed - Unique identifier (name, email, id, etc.)
 * @param style - DiceBear style (default: bottts for agents)
 * @param size - Avatar size in pixels (default: 128)
 */
export function generateAvatar(
  seed: string,
  style: AvatarStyle = 'bottts',
  size: number = 128
): string {
  // Encode the seed to be URL-safe
  const encodedSeed = encodeURIComponent(seed);
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodedSeed}&size=${size}`;
}

/**
 * Generate a robot avatar (good for AI agents)
 */
export function generateAgentAvatar(name: string, size: number = 128): string {
  return generateAvatar(name, 'bottts', size);
}

/**
 * Generate an identicon (good for users who prefer geometric patterns)
 */
export function generateIdenticon(seed: string, size: number = 128): string {
  return generateAvatar(seed, 'identicon', size);
}

/**
 * Generate a pixel art avatar
 */
export function generatePixelAvatar(seed: string, size: number = 128): string {
  return generateAvatar(seed, 'pixel-art', size);
}

/**
 * Get avatar URL with fallback to generated avatar
 * @param providedUrl - User-provided avatar URL (may be null/undefined)
 * @param seed - Seed for generating fallback avatar
 * @param style - Style for generated avatar
 */
export function getAvatarUrl(
  providedUrl: string | null | undefined,
  seed: string,
  style: AvatarStyle = 'bottts'
): string {
  // Use provided URL if valid
  if (providedUrl && (providedUrl.startsWith('http://') || providedUrl.startsWith('https://'))) {
    return providedUrl;
  }
  
  // Generate fallback avatar
  return generateAvatar(seed, style);
}

/**
 * Get avatar URL for an agent (uses bottts style)
 */
export function getAgentAvatarUrl(
  providedUrl: string | null | undefined,
  agentName: string
): string {
  return getAvatarUrl(providedUrl, agentName, 'bottts');
}

/**
 * Get avatar URL for a human user (uses identicon style)
 */
export function getUserAvatarUrl(
  providedUrl: string | null | undefined,
  username: string
): string {
  return getAvatarUrl(providedUrl, username, 'identicon');
}
