import { useEffect, useState } from 'react'
import { AstrologerApiError, astrologerApi, type AstrologerBlogPost } from '../api/astrologer'
import { Button } from './Button'
import { Card } from './Card'
import { Dialog } from './Dialog'
import { Skeleton } from './Skeleton'

type Props = { onSignedOut: () => void }

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value))
}

export function AstrologerBlogs({ onSignedOut }: Props) {
  const [posts, setPosts] = useState<AstrologerBlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<AstrologerBlogPost | null>(null)
  const [isWriting, setIsWriting] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<AstrologerBlogPost | null>(null)

  const handleFailure = (failure: unknown, fallback: string) => {
    if (failure instanceof AstrologerApiError && failure.status === 401) onSignedOut()
    else setError(failure instanceof Error ? failure.message : fallback)
  }

  useEffect(() => {
    let active = true
    astrologerApi.getBlogs().then((loaded) => { if (active) setPosts(loaded) }).catch((failure: unknown) => {
      if (!active) return
      if (failure instanceof AstrologerApiError && failure.status === 401) onSignedOut()
      else setError(failure instanceof Error ? failure.message : 'Blogs are unavailable. Please try again.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [onSignedOut])

  const startNew = () => {
    setEditing(null)
    setTitle('')
    setBody('')
    setError('')
    setIsWriting(true)
  }

  const startEdit = (post: AstrologerBlogPost) => {
    setEditing(post)
    setTitle(post.title)
    setBody(post.body)
    setError('')
    setIsWriting(true)
  }

  const save = async (status: 'draft' | 'published') => {
    if (!title.trim()) { setError('Enter a title.'); return }
    if (!body.trim()) { setError('Write the post body.'); return }
    setSaving(true)
    setError('')
    try {
      const saved = await astrologerApi.saveBlog(editing?.id ?? null, { title, body, status })
      setPosts((current) => [saved, ...current.filter((post) => post.id !== saved.id)])
      setEditing(saved)
      setTitle(saved.title)
      setBody(saved.body)
    } catch (failure) { handleFailure(failure, 'The post could not be saved. Please try again.') }
    finally { setSaving(false) }
  }

  const removePost = async () => {
    if (!deleteTarget) return
    try {
      await astrologerApi.deleteBlog(deleteTarget.id)
      setPosts((current) => current.filter((post) => post.id !== deleteTarget.id))
      if (editing?.id === deleteTarget.id) {
        setIsWriting(false)
        setEditing(null)
      }
      setDeleteTarget(null)
    } catch (failure) { handleFailure(failure, 'The post could not be deleted. Please try again.') }
  }

  const removeComment = async (postId: string, commentId: string) => {
    try {
      await astrologerApi.deleteBlogComment(postId, commentId)
      setPosts((current) => current.map((post) => post.id === postId ? {
        ...post,
        comments: post.comments.filter((comment) => comment.id !== commentId),
        commentCount: Math.max(0, post.commentCount - 1),
      } : post))
      setEditing((current) => current?.id === postId ? {
        ...current,
        comments: current.comments.filter((comment) => comment.id !== commentId),
        commentCount: Math.max(0, current.commentCount - 1),
      } : current)
    } catch (failure) { handleFailure(failure, 'The comment could not be deleted. Please try again.') }
  }

  if (loading) return <Card aria-busy="true"><Skeleton variant="title" /><Skeleton /><Skeleton /></Card>

  return (
    <div className="astrologer-blogs">
      <div className="astrologer-blog-actions"><Button onClick={startNew}>Write a post</Button></div>
      {error ? <p className="field__error" role="alert">{error}</p> : null}
      {isWriting ? (
        <Card>
          <div className="stack">
            <div className="owner-section__heading"><div><h3>{editing ? 'Edit post' : 'New post'}</h3>{editing ? <p className="owner-muted">{editing.status === 'published' ? 'Published' : 'Draft'}</p> : null}</div><Button onClick={() => setIsWriting(false)} variant="text">Close editor</Button></div>
            <label className="field"><span className="field__label">Title</span><input className="input" maxLength={120} onChange={(event) => setTitle(event.target.value)} value={title} /><span className="field__hint">{title.length}/120</span></label>
            <label className="field"><span className="field__label">Body</span><textarea className="input blog-editor__body" onChange={(event) => setBody(event.target.value)} value={body} /></label>
            <div className="astrologer-form-actions">
              {editing?.status === 'published' ? <Button disabled={saving} onClick={() => void save('draft')} variant="secondary">Unpublish</Button> : <Button disabled={saving} onClick={() => void save('draft')} variant="secondary">Save draft</Button>}
              <Button disabled={saving} onClick={() => void save('published')}>{saving ? 'Saving…' : editing?.status === 'published' ? 'Publish changes' : 'Publish'}</Button>
              {editing ? <Button onClick={() => setDeleteTarget(editing)} variant="text">Delete</Button> : null}
            </div>
            {editing?.comments.length ? (
              <section className="author-comments" aria-labelledby="author-comments-heading">
                <h4 id="author-comments-heading">Comments</h4>
                {editing.comments.map((comment) => <article className="author-comment" key={comment.id}><div><strong>{comment.authorFirstName}</strong><time dateTime={comment.createdAt}>{formatDate(comment.createdAt)}</time><p>{comment.body}</p></div><Button onClick={() => void removeComment(editing.id, comment.id)} variant="text">Delete</Button></article>)}
              </section>
            ) : null}
          </div>
        </Card>
      ) : null}
      <div className="astrologer-blog-list">
        {posts.length ? posts.map((post) => (
          <Card key={post.id}>
            <div className="astrologer-blog-row"><div><span className={`status-badge status-badge--${post.status === 'published' ? 'completed' : 'upcoming'}`}>{post.status === 'published' ? 'Published' : 'Draft'}</span><h3>{post.title}</h3><p className="owner-muted">Updated {formatDate(post.updatedAt)} · {post.likeCount} likes · {post.commentCount} comments</p></div><Button onClick={() => startEdit(post)} variant="secondary">Edit</Button></div>
          </Card>
        )) : <Card className="home-state"><p>You have not written any posts yet.</p></Card>}
      </div>
      <Dialog onClose={() => setDeleteTarget(null)} open={Boolean(deleteTarget)} title="Delete post?">
        <div className="stack"><p>This permanently deletes “{deleteTarget?.title}” and its likes and comments.</p><div className="dialog__actions"><Button onClick={() => setDeleteTarget(null)} variant="secondary">Keep post</Button><Button onClick={() => void removePost()}>Delete post</Button></div></div>
      </Dialog>
    </div>
  )
}

