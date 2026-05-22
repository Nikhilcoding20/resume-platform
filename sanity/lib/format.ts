export function formatPostDate(iso: string | undefined) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

export function slugifyHeading(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
}

export function blockChildrenToText(children: { text?: string }[] = []) {
  return children.map((c) => c.text || '').join('')
}

export function getH2Headings(
  body: { _type?: string; style?: string; children?: { text?: string }[] }[] = []
) {
  return body
    .filter((block) => block._type === 'block' && block.style === 'h2')
    .map((block) => {
      const text = blockChildrenToText(block.children)
      return { id: slugifyHeading(text), text }
    })
    .filter((h) => h.text)
}
