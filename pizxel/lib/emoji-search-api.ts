/**
 * Emoji Search API
 *
 * Provides name-based emoji search using an online emoji database.
 * Falls back to local spritesheet when emojis are found.
 */

import { isNetworkAllowed } from "../core/network";

export interface EmojiSearchResult {
  emoji: string; // The actual emoji character
  unicodeCodePoint: string; // e.g., "1F602"
  name: string; // e.g., "face with tears of joy"
  category?: string;
  aliases?: string[];
}

/**
 * Search for emojis by name using emoji-api.com
 * Returns unicode codepoints that can be matched against local spritesheet
 */
export async function searchEmojisByName(
  query: string,
  apiKey?: string
): Promise<EmojiSearchResult[]> {
  if (!query || query.trim().length === 0) {
    return [];
  }

  // If API key is provided (and network use is allowed), try the real API
  if (apiKey && isNetworkAllowed()) {
    try {
      const url = `https://emoji-api.com/emojis?search=${encodeURIComponent(
        query
      )}&access_key=${apiKey}`;

      const response = await fetch(url);
      if (!response.ok) {
        console.warn(
          `[EmojiSearch] API returned ${response.status}: ${response.statusText}`
        );
        return fallbackSearch(query);
      }

      const data = await response.json();

      // Check if it's an error response
      if (data.status === "error") {
        console.warn(`[EmojiSearch] API error: ${data.message}`);
        return fallbackSearch(query);
      }

      // Transform API response to our format
      if (Array.isArray(data)) {
        const results: EmojiSearchResult[] = data.map((item: any) => ({
          emoji: item.character,
          unicodeCodePoint:
            item.codePoint?.replace("U+", "").toLowerCase() || "",
          name: item.unicodeName?.toLowerCase() || "",
          category: item.group,
          aliases: item.slug ? [item.slug] : [],
        }));

        return results.slice(0, 50); // Limit results
      }
    } catch (error) {
      console.error("[EmojiSearch] API request failed:", error);
      return fallbackSearch(query);
    }
  }

  // No API key or API failed, use fallback
  return fallbackSearch(query);
}

/**
 * Fallback search using local simple matching
 */
function fallbackSearch(query: string): EmojiSearchResult[] {
  const q = query.toLowerCase();

  // Expanded list of common emojis with searchable names
  const commonEmojis: EmojiSearchResult[] = [
    // Faces
    {
      emoji: "😀",
      unicodeCodePoint: "1f600",
      name: "grinning face smile happy",
    },
    {
      emoji: "😂",
      unicodeCodePoint: "1f602",
      name: "face with tears of joy laugh funny",
    },
    {
      emoji: "😍",
      unicodeCodePoint: "1f60d",
      name: "smiling face with heart eyes love",
    },
    {
      emoji: "😊",
      unicodeCodePoint: "1f60a",
      name: "smiling face with smiling eyes happy",
    },
    {
      emoji: "😎",
      unicodeCodePoint: "1f60e",
      name: "smiling face with sunglasses cool",
    },
    {
      emoji: "🤔",
      unicodeCodePoint: "1f914",
      name: "thinking face wonder hmm",
    },
    {
      emoji: "😴",
      unicodeCodePoint: "1f634",
      name: "sleeping face tired sleep",
    },
    {
      emoji: "😱",
      unicodeCodePoint: "1f631",
      name: "face screaming in fear scared shock",
    },

    // Hearts & symbols
    { emoji: "❤️", unicodeCodePoint: "2764", name: "red heart love" },
    { emoji: "💙", unicodeCodePoint: "1f499", name: "blue heart love" },
    { emoji: "💚", unicodeCodePoint: "1f49a", name: "green heart love" },
    { emoji: "💛", unicodeCodePoint: "1f49b", name: "yellow heart love" },
    { emoji: "⭐", unicodeCodePoint: "2b50", name: "star favorite" },
    { emoji: "✨", unicodeCodePoint: "2728", name: "sparkles magic shine" },
    { emoji: "🔥", unicodeCodePoint: "1f525", name: "fire flame hot" },
    { emoji: "💧", unicodeCodePoint: "1f4a7", name: "droplet water rain" },
    {
      emoji: "⚡",
      unicodeCodePoint: "26a1",
      name: "high voltage lightning electric",
    },

    // Gaming & entertainment
    {
      emoji: "🎮",
      unicodeCodePoint: "1f3ae",
      name: "video game controller gaming play",
    },
    {
      emoji: "🎯",
      unicodeCodePoint: "1f3af",
      name: "direct hit target bullseye game",
    },
    { emoji: "🎲", unicodeCodePoint: "1f3b2", name: "game die dice play" },
    { emoji: "🕹️", unicodeCodePoint: "1f579", name: "joystick game arcade" },
    { emoji: "🎪", unicodeCodePoint: "1f3aa", name: "circus tent fun show" },
    {
      emoji: "🎬",
      unicodeCodePoint: "1f3ac",
      name: "clapper board movie film",
    },
    { emoji: "🎵", unicodeCodePoint: "1f3b5", name: "musical note music song" },
    { emoji: "🎸", unicodeCodePoint: "1f3b8", name: "guitar music rock" },

    // Animals
    {
      emoji: "🐸",
      unicodeCodePoint: "1f438",
      name: "frog face animal amphibian",
    },
    { emoji: "🐶", unicodeCodePoint: "1f436", name: "dog face animal pet" },
    { emoji: "🐱", unicodeCodePoint: "1f431", name: "cat face animal pet" },
    {
      emoji: "🐭",
      unicodeCodePoint: "1f42d",
      name: "mouse face animal rodent",
    },
    { emoji: "🦊", unicodeCodePoint: "1f98a", name: "fox face animal" },
    { emoji: "🐻", unicodeCodePoint: "1f43b", name: "bear face animal" },
    { emoji: "🐼", unicodeCodePoint: "1f43c", name: "panda face animal" },
    { emoji: "🐯", unicodeCodePoint: "1f42f", name: "tiger face animal" },
    { emoji: "🦁", unicodeCodePoint: "1f981", name: "lion face animal" },
    { emoji: "🐔", unicodeCodePoint: "1f414", name: "chicken bird animal" },
    { emoji: "🐧", unicodeCodePoint: "1f427", name: "penguin bird animal" },
    { emoji: "🦅", unicodeCodePoint: "1f985", name: "eagle bird animal" },

    // Food
    { emoji: "🍕", unicodeCodePoint: "1f355", name: "pizza food italian" },
    { emoji: "🍔", unicodeCodePoint: "1f354", name: "hamburger burger food" },
    { emoji: "🍟", unicodeCodePoint: "1f35f", name: "french fries food" },
    { emoji: "🍿", unicodeCodePoint: "1f37f", name: "popcorn snack movie" },
    {
      emoji: "🎂",
      unicodeCodePoint: "1f382",
      name: "birthday cake dessert party",
    },
    { emoji: "🍰", unicodeCodePoint: "1f370", name: "shortcake cake dessert" },
    { emoji: "🍪", unicodeCodePoint: "1f36a", name: "cookie snack dessert" },
    { emoji: "🍫", unicodeCodePoint: "1f36b", name: "chocolate bar candy" },

    // Apps & objects
    { emoji: "📰", unicodeCodePoint: "1f4f0", name: "newspaper news article" },
    { emoji: "⏰", unicodeCodePoint: "23f0", name: "alarm clock time" },
    { emoji: "⏲️", unicodeCodePoint: "23f2", name: "timer clock countdown" },
    {
      emoji: "📱",
      unicodeCodePoint: "1f4f1",
      name: "mobile phone cell smartphone",
    },
    { emoji: "💻", unicodeCodePoint: "1f4bb", name: "laptop computer pc" },
    { emoji: "⌨️", unicodeCodePoint: "2328", name: "keyboard computer typing" },
    { emoji: "🖥️", unicodeCodePoint: "1f5a5", name: "desktop computer pc" },
    { emoji: "📺", unicodeCodePoint: "1f4fa", name: "television tv screen" },

    // Weather
    {
      emoji: "🌤️",
      unicodeCodePoint: "1f324",
      name: "sun behind small cloud weather partly cloudy",
    },
    { emoji: "⛅", unicodeCodePoint: "26c5", name: "sun behind cloud weather" },
    { emoji: "☀️", unicodeCodePoint: "2600", name: "sun sunny weather" },
    {
      emoji: "🌧️",
      unicodeCodePoint: "1f327",
      name: "cloud with rain weather rainy",
    },
    {
      emoji: "⛈️",
      unicodeCodePoint: "26c8",
      name: "cloud with lightning and rain storm",
    },
    {
      emoji: "🌩️",
      unicodeCodePoint: "1f329",
      name: "cloud with lightning thunder",
    },
    {
      emoji: "❄️",
      unicodeCodePoint: "2744",
      name: "snowflake snow cold winter",
    },
    {
      emoji: "🌈",
      unicodeCodePoint: "1f308",
      name: "rainbow weather colorful",
    },
  ];

  return commonEmojis.filter(
    (e) => e.name.includes(q) || e.emoji.includes(query)
  );
}
