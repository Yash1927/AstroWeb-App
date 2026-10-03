import { Fragment, type ReactNode } from 'react'
import type { BlogDocument as Document, BlogNode } from '../api/astrologer'

function children(node: BlogNode, key: string): ReactNode {
  return node.content?.map((child, index) => renderNode(child, `${key}-${index}`))
}

function marked(node: BlogNode, value: ReactNode, key: string) {
  return (node.marks ?? []).reduce<ReactNode>((content, mark, index) => {
    if (mark.type === 'bold') return <strong key={`${key}-b-${index}`}>{content}</strong>
    if (mark.type === 'italic') return <em key={`${key}-i-${index}`}>{content}</em>
    if (mark.type === 'underline') return <u key={`${key}-u-${index}`}>{content}</u>
    if (mark.type === 'link') return <a href={String(mark.attrs?.href ?? '')} key={`${key}-a-${index}`} rel="noopener noreferrer nofollow ugc" target="_blank">{content}</a>
    return content
  }, value)
}

function renderNode(node: BlogNode, key: string): ReactNode {
  if (node.type === 'text') return <Fragment key={key}>{marked(node, node.text ?? '', key)}</Fragment>
  if (node.type === 'paragraph') return <p key={key}>{children(node, key)}</p>
  if (node.type === 'heading' && node.attrs?.level === 2) return <h2 key={key}>{children(node, key)}</h2>
  if (node.type === 'heading' && node.attrs?.level === 3) return <h3 key={key}>{children(node, key)}</h3>
  if (node.type === 'blockquote') return <blockquote key={key}>{children(node, key)}</blockquote>
  if (node.type === 'bulletList') return <ul key={key}>{children(node, key)}</ul>
  if (node.type === 'orderedList') return <ol key={key}>{children(node, key)}</ol>
  if (node.type === 'listItem') return <li key={key}>{children(node, key)}</li>
  if (node.type === 'hardBreak') return <br key={key} />
  if (node.type === 'image') {
    const caption = typeof node.attrs?.title === 'string' ? node.attrs.title : ''
    return <figure key={key}><img alt={String(node.attrs?.alt ?? '')} src={String(node.attrs?.src ?? '')} />{caption ? <figcaption>{caption}</figcaption> : null}</figure>
  }
  return null
}

export function BlogDocument({ document }: { document: Document }) {
  return <>{document.content?.map((node, index) => renderNode(node, String(index)))}</>
}
