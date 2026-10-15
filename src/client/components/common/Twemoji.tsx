import React, { useState } from 'react';

// Converts unicode emoji (including surrogate pairs and variation selectors) to Twemoji hex code point
export function getTwemojiCodePoint(rawEmoji: string): string {
  const codePoints: string[] = [];
  for (let i = 0; i < rawEmoji.length; i++) {
    const code = rawEmoji.codePointAt(i);
    if (code !== undefined) {
      // Omit variation selector 16 (fe0f) for Twemoji asset filenames
      if (code !== 0xfe0f) {
        codePoints.push(code.toString(16).toLowerCase());
      }
      if (code > 0xffff) {
        i++; // skip second surrogate pair unit
      }
    }
  }
  return codePoints.join('-');
}

interface TwemojiProps {
  emoji: string;
  className?: string;
  alt?: string;
}

/**
 * Renders an emoji using Twitter's official Twemoji SVG vectors.
 * Falls back to native emoji text if offline or if asset fails to load.
 */
export const Twemoji: React.FC<TwemojiProps> = ({
  emoji,
  className = 'w-3.5 h-3.5 inline-block align-middle',
  alt,
}) => {
  const [hasError, setHasError] = useState(false);
  const codePoint = getTwemojiCodePoint(emoji.trim());

  if (hasError || !codePoint) {
    return <span className={`inline-block select-none leading-none ${className}`}>{emoji}</span>;
  }

  const src = `https://cdn.jsdelivr.net/gh/twitter/twemoji@14.0.2/assets/svg/${codePoint}.svg`;

  return (
    <img
      src={src}
      alt={alt || emoji}
      draggable={false}
      onError={() => setHasError(true)}
      className={`inline-block select-none object-contain pointer-events-none ${className}`}
      loading="lazy"
    />
  );
};

// Regex matching unicode emoji sequences
const EMOJI_REGEX = /(\p{Extended_Pictographic}+)/gu;

/**
 * Parses any text containing emojis and replaces emoji characters with crisp Twemoji SVG components.
 */
export function renderWithTwemoji(
  text: string,
  emojiClassName: string = 'w-3.5 h-3.5 inline-block align-middle'
): React.ReactNode {
  if (!text) return text;
  const parts = text.split(EMOJI_REGEX);
  if (parts.length <= 1) return text;

  return parts.map((part, index) => {
    if (part.match(EMOJI_REGEX)) {
      return <Twemoji key={index} emoji={part} className={emojiClassName} />;
    }
    return part;
  });
}
