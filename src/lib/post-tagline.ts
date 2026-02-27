/**
 * TBHF donation tagline appended to every post caption.
 * Placed before hashtags. Hashtags are always moved to the end.
 * @see https://www.tbhfdn.org/
 * @see https://www.tbhfdn.org/donate
 */
export const POST_TAGLINE =
  'Support The Black History Foundation by making a donation at https://www.tbhfdn.org/donate';

const HASHTAG_REGEX = /#\w+/g;

/**
 * Appends the TBHF donation tagline to a caption.
 * Places the tagline before hashtags. Always moves hashtags to the end of the post.
 * Strips any existing tagline first to avoid duplication.
 */
export function appendTagline(caption: string): string {
  let trimmed = caption.trim();
  // Strip tagline from anywhere (e.g. when AI includes it in caption)
  trimmed = trimmed.split(POST_TAGLINE).join('').trim();
  if (!trimmed) return POST_TAGLINE;

  const hashtags = Array.from(trimmed.matchAll(HASHTAG_REGEX), (m) => m[0]);
  const mainContent = trimmed
    .replace(HASHTAG_REGEX, '')
    .replace(/  +/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const hashtagBlock = Array.from(new Set(hashtags)).join(' ');

  if (hashtagBlock) {
    return mainContent
      ? `${mainContent}\n\n${POST_TAGLINE}\n\n${hashtagBlock}`
      : `${POST_TAGLINE}\n\n${hashtagBlock}`;
  }
  return `${mainContent}\n\n${POST_TAGLINE}`;
}
