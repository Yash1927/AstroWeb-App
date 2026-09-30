type AvatarSize = 32 | 40 | 56 | 96

type AvatarProps = {
  id: string
  name: string
  size?: AvatarSize
}

const graphemeSegmenter = new Intl.Segmenter(undefined, {
  granularity: 'grapheme',
})

function firstGrapheme(value: string) {
  return graphemeSegmenter.segment(value)[Symbol.iterator]().next().value
    ?.segment ?? ''
}

function initialsFor(name: string) {
  const words = name.trim().split(/\s+/u).filter(Boolean)

  if (words.length === 0) {
    return '?'
  }

  const first = firstGrapheme(words[0])
  const last = words.length > 1 ? firstGrapheme(words.at(-1) ?? '') : ''

  return `${first}${last}`.toLocaleUpperCase()
}

function colourFor(id: string) {
  let hash = 2_166_136_261

  for (const character of id) {
    hash ^= character.codePointAt(0) ?? 0
    hash = Math.imul(hash, 16_777_619)
  }

  return Math.abs(hash) % 6
}

export function Avatar({ id, name, size = 40 }: AvatarProps) {
  const initials = initialsFor(name)
  const colour = colourFor(id) + 1

  return (
    <span
      aria-label={name || 'Unnamed person'}
      className={`avatar avatar--${size} avatar--color-${colour}`}
      role="img"
      title={name || 'Unnamed person'}
    >
      {initials}
    </span>
  )
}
