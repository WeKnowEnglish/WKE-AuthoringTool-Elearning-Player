/** Topic emoji mapped to Twemoji CDN assets (colorful, kid-friendly, no local files). */
export const SECONDARY_TOPIC_EMOJI: Record<string, string> = {
  "school-life": "📚",
  "daily-routines": "⏰",
  personality: "🙂",
  "feelings-opinions": "💭",
  "food-health": "🥗",
  "places-directions": "🗺️",
  "technology-online-life": "💻",
  environment: "🌿",
  "stories-past-events": "📖",
  "future-plans-jobs": "🎯",
  "social-life-communication": "💬",
  "academic-classroom-language": "✏️",
};

const TWEMOJI_CDN = "https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets";

/** Convert emoji to Twemoji PNG URL (strips variation selectors). */
export function emojiToTwemojiAssetUrl(emoji: string, size: 36 | 72 = 72): string {
  const codePoints = [...emoji]
    .map((char) => char.codePointAt(0)!)
    .filter((codePoint) => codePoint !== 0xfe0f)
    .map((codePoint) => codePoint.toString(16))
    .join("-");

  return `${TWEMOJI_CDN}/${size}x${size}/${codePoints}.png`;
}

export function getSecondaryTopicEmoji(topicId: string): string {
  return SECONDARY_TOPIC_EMOJI[topicId] ?? "📖";
}

export function getSecondaryTopicIconUrl(topicId: string): string {
  return emojiToTwemojiAssetUrl(getSecondaryTopicEmoji(topicId));
}

export function isSecondaryWebIconUrl(url: string): boolean {
  return url.includes("twemoji") || url.includes("iconify.design");
}
