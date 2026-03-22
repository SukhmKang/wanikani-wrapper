import React from 'react'

/**
 * Parse WaniKani mnemonic markup tags and render them as styled React elements.
 *
 * Supported tags:
 *   <radical>x</radical>      -> pink/salmon background pill
 *   <kanji>x</kanji>          -> pink background pill
 *   <vocabulary>x</vocabulary> -> purple background pill
 *   <meaning>x</meaning>      -> bold span
 *   <reading>x</reading>      -> bold italic span
 */
export function renderMarkup(text) {
  if (!text) return null

  // Match all known tags
  const tagPattern = /<(radical|kanji|vocabulary|meaning|reading)>(.*?)<\/\1>/g

  const parts = []
  let lastIndex = 0
  let match

  while ((match = tagPattern.exec(text)) !== null) {
    const [fullMatch, tagName, inner] = match
    const start = match.index

    // Push plain text before this match
    if (start > lastIndex) {
      parts.push(text.slice(lastIndex, start))
    }

    // Push styled element for the tag
    parts.push(
      <TagElement key={start} type={tagName}>
        {inner}
      </TagElement>
    )

    lastIndex = start + fullMatch.length
  }

  // Push remaining plain text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex))
  }

  return parts
}

function TagElement({ type, children }) {
  switch (type) {
    case 'radical':
      return (
        <span className="inline-block px-1.5 py-0.5 mx-0.5 rounded bg-sky-200 text-sky-900 font-medium text-sm">
          {children}
        </span>
      )
    case 'kanji':
      return (
        <span className="inline-block px-1.5 py-0.5 mx-0.5 rounded bg-pink-200 text-pink-900 font-medium text-sm">
          {children}
        </span>
      )
    case 'vocabulary':
      return (
        <span className="inline-block px-1.5 py-0.5 mx-0.5 rounded bg-purple-200 text-purple-900 font-medium text-sm">
          {children}
        </span>
      )
    case 'meaning':
      return <strong className="font-bold">{children}</strong>
    case 'reading':
      return <em className="font-bold italic">{children}</em>
    default:
      return <span>{children}</span>
  }
}
