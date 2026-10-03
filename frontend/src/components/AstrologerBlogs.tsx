import { lazy, Suspense, useCallback, useEffect, useId, useRef, useState } from 'react'
import { AstrologerApiError, astrologerApi, type AstrologerBlogPost, type BlogDocument, type MediaAsset } from '../api/astrologer'
import { withLowercaseDayPeriod } from '../display-time'
import { Button } from './Button'
import { Card } from './Card'
import { Dialog } from './Dialog'
import { Skeleton } from './Skeleton'

type Props = { onSignedOut: () => void }
const emptyDocument: BlogDocument = { type: 'doc', content: [{ type: 'paragraph' }] }
const RichBlogEditor = lazy(() => import('./RichBlogEditor').then((module) => ({ default: module.RichBlogEditor })))

function formatDate(value: string) {
  return withLowercaseDayPeriod(new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata',
  }).format(new Date(value)))
}

function hasContent(document: BlogDocument) {
  return JSON.stringify(document).includes('"text"') || JSON.stringify(document).includes('"type":"image"')
}

export function AstrologerBlogs({ onSignedOut }: Props) {
  const [posts, setPosts] = useState<AstrologerBlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState<AstrologerBlogPost | null>(null)
  const [isWriting, setIsWriting] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState<BlogDocument>(emptyDocument)
  const [coverMediaId, setCoverMediaId] = useState<string | null>(null)
  const [coverUrl, setCoverUrl] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'failed'>('idle')
  const [coverBusy, setCoverBusy] = useState(false)
  const [uploadedImages, setUploadedImages] = useState<MediaAsset[]>([])
  const [deleteTarget, setDeleteTarget] = useState<AstrologerBlogPost | null>(null)
  const [commentDeleteTarget, setCommentDeleteTarget] = useState<{ comment: AstrologerBlogPost['comments'][number]; postId: string } | null>(null)
  const [deletingComment, setDeletingComment] = useState(false)
  const [editorSessionKey, setEditorSessionKey] = useState(0)
  const editRevision = useRef(0)
  const coverInputId = useId()

  const markDirty = () => {
    editRevision.current += 1
    setDirty(true)
    setSaveStatus('idle')
  }

  const handleFailure = useCallback((failure: unknown, fallback: string) => {
    if (failure instanceof AstrologerApiError && failure.status === 401) onSignedOut()
    else setError(failure instanceof Error ? failure.message : fallback)
  }, [onSignedOut])

  useEffect(() => {
    let active = true
    const load = () => { void astrologerApi.getBlogs().then((loaded) => { if (active) setPosts(loaded) }).catch((failure: unknown) => {
      if (active) handleFailure(failure, 'Blogs are unavailable. Please try again.')
    }).finally(() => { if (active) setLoading(false) }) }
    load(); window.addEventListener('focus', load)
    return () => { active = false; window.removeEventListener('focus', load) }
  }, [handleFailure])

  useEffect(() => {
    if (!isWriting || !dirty || saving || !title.trim() || !hasContent(body)) return
    const timer = window.setTimeout(() => {
      const savingRevision = editRevision.current
      setSaving(true); setSaveStatus('saving')
      void astrologerApi.saveBlog(editing?.id ?? null, { title, body, coverMediaId, status: editing?.status ?? 'draft' })
        .then((saved) => {
          setEditing(saved); setPosts((current) => [saved, ...current.filter((post) => post.id !== saved.id)])
          setError('')
          if (editRevision.current === savingRevision) { setDirty(false); setSaveStatus('saved') }
        })
        .catch((failure: unknown) => {
          if (editRevision.current === savingRevision) {
            setDirty(false); setSaveStatus('failed')
          }
          handleFailure(failure, 'The draft could not be saved.')
        })
        .finally(() => setSaving(false))
    }, 2500)
    return () => window.clearTimeout(timer)
  }, [body, coverMediaId, dirty, editing?.id, editing?.status, handleFailure, isWriting, saving, title])

  const startNew = () => {
    editRevision.current = 0
    setEditorSessionKey((current) => current + 1)
    setEditing(null); setTitle(''); setBody(emptyDocument); setCoverMediaId(null); setCoverUrl(null)
    setError(''); setDirty(false); setSaveStatus('idle'); setUploadedImages([]); setIsWriting(true)
  }

  const startEdit = (post: AstrologerBlogPost) => {
    editRevision.current = 0
    setEditorSessionKey((current) => current + 1)
    setEditing(post); setTitle(post.title); setBody(post.body); setCoverMediaId(post.coverMediaId); setCoverUrl(post.coverUrl)
    setError(''); setDirty(false); setSaveStatus('saved'); setUploadedImages([]); setIsWriting(true)
  }

  const save = async (status: 'draft' | 'published') => {
    if (!title.trim()) { setError('Enter a title.'); return }
    if (!hasContent(body)) { setError('Write the post body.'); return }
    const savingRevision = editRevision.current
    setSaving(true); setSaveStatus('saving'); setError('')
    try {
      const saved = await astrologerApi.saveBlog(editing?.id ?? null, { title, body, coverMediaId, status })
      setError('')
      setPosts((current) => [saved, ...current.filter((post) => post.id !== saved.id)])
      setEditing(saved)
      if (editRevision.current === savingRevision) {
        setTitle(saved.title); setBody(saved.body); setCoverMediaId(saved.coverMediaId); setCoverUrl(saved.coverUrl); setDirty(false); setSaveStatus('saved')
      }
    } catch (failure) {
      if (editRevision.current === savingRevision) {
        setDirty(false); setSaveStatus('failed')
      }
      handleFailure(failure, 'The post could not be saved. Please try again.')
    }
    finally { setSaving(false) }
  }

  const uploadCover = async (file: File | undefined) => {
    if (!file) return
    setCoverBusy(true); setError('')
    try {
      const asset = await astrologerApi.uploadBlogImage(file)
      setCoverMediaId(asset.id); setCoverUrl(asset.url); markDirty()
    } catch (failure) { handleFailure(failure, 'The cover could not be uploaded.') }
    finally { setCoverBusy(false) }
  }

  const removePost = async () => {
    if (!deleteTarget) return
    try {
      await astrologerApi.deleteBlog(deleteTarget.id)
      setPosts((current) => current.filter((post) => post.id !== deleteTarget.id))
      if (editing?.id === deleteTarget.id) { setIsWriting(false); setEditing(null) }
      setDeleteTarget(null)
    } catch (failure) { handleFailure(failure, 'The post could not be deleted. Please try again.') }
  }

  const removeComment = async () => {
    if (!commentDeleteTarget || deletingComment) return
    const { postId, comment } = commentDeleteTarget; setDeletingComment(true)
    try {
      await astrologerApi.deleteBlogComment(postId, comment.id)
      const without = (post: AstrologerBlogPost) => ({ ...post, comments: post.comments.filter((item) => item.id !== comment.id), commentCount: Math.max(0, post.commentCount - 1) })
      setPosts((current) => current.map((post) => post.id === postId ? without(post) : post))
      setEditing((current) => current?.id === postId ? without(current) : current); setCommentDeleteTarget(null)
    } catch (failure) { handleFailure(failure, 'The comment could not be deleted. Please try again.') }
    finally { setDeletingComment(false) }
  }

  if (loading) return <Card aria-busy="true"><Skeleton variant="title" /><Skeleton /><Skeleton /></Card>

  return (
    <div className="astrologer-blogs">
      <div className="astrologer-blog-actions"><Button onClick={startNew}>Write a post</Button></div>
      {error ? <p className="field__error" role="alert">{error}</p> : null}
      {isWriting ? (
        <Card>
          <div className="stack">
            <div className="owner-section__heading"><div><h3>{editing ? 'Edit post' : 'New post'}</h3><p aria-live="polite" className="owner-muted">{saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved' : saveStatus === 'failed' ? 'Not saved' : editing?.status === 'published' ? 'Published' : 'Draft'}</p></div><Button onClick={() => setIsWriting(false)} variant="text">Close editor</Button></div>
            <label className="field"><span className="field__label">Title</span><input aria-label="Post title" className="blog-editor__title" maxLength={120} onChange={(event) => { setTitle(event.target.value); markDirty() }} placeholder="Post title" value={title} /><span className="field__hint">{title.length}/120</span></label>
            <Suspense fallback={<div aria-busy="true"><Skeleton /><Skeleton /></div>}>
              <RichBlogEditor initialContent={body} key={editorSessionKey} onChange={(document) => { setBody(document); markDirty() }} onError={setError} onImageUploaded={(asset) => setUploadedImages((current) => [...current, asset])} />
            </Suspense>
            <div className="blog-cover-picker">
              {coverUrl ? <img alt="Post cover preview" src={coverUrl} /> : null}
              <div className="field"><span className="field__label">Optional cover image</span><input accept="image/jpeg,image/png,image/webp" className="visually-hidden" id={coverInputId} onChange={(event) => { void uploadCover(event.target.files?.[0]); event.currentTarget.value = '' }} type="file" /><label className="button button--secondary blog-cover-upload" htmlFor={coverInputId}>Upload cover</label><span className="field__hint">If omitted, the first image in the post is used.</span></div>
              {coverMediaId ? <Button onClick={() => { setCoverMediaId(null); setCoverUrl(null); markDirty() }} variant="text">Use first post image</Button> : null}
              {uploadedImages.length ? <div className="blog-cover-picker__choices" aria-label="Choose a post image as the cover">{uploadedImages.map((asset) => <button aria-pressed={coverMediaId === asset.id} key={asset.id} onClick={() => { setCoverMediaId(asset.id); setCoverUrl(asset.url); markDirty() }} type="button"><img alt="Use this post image as the cover" src={asset.url} /></button>)}</div> : null}
              {coverBusy ? <p aria-live="polite">Uploading cover…</p> : null}
            </div>
            <div className="astrologer-form-actions">
              {editing?.status === 'published' ? <Button disabled={saving} onClick={() => void save('draft')} variant="secondary">Unpublish</Button> : <Button disabled={saving} onClick={() => void save('draft')} variant="secondary">Save draft</Button>}
              <Button disabled={saving} onClick={() => void save('published')}>{saving ? 'Saving…' : editing?.status === 'published' ? 'Publish changes' : 'Publish'}</Button>
              {editing ? <Button onClick={() => setDeleteTarget(editing)} variant="text">Delete</Button> : null}
            </div>
            {editing?.comments.length ? <section aria-labelledby="author-comments-heading" className="author-comments"><h4 id="author-comments-heading">Comments</h4>{editing.comments.map((comment) => <article className="author-comment" key={comment.id}><div><strong>{comment.authorFirstName}</strong><time dateTime={comment.createdAt}>{formatDate(comment.createdAt)}</time><p>{comment.body}</p></div><Button onClick={() => setCommentDeleteTarget({ postId: editing.id, comment })} variant="text">Delete</Button></article>)}</section> : null}
          </div>
        </Card>
      ) : null}
      <div className="astrologer-blog-list">
        {posts.length ? posts.map((post) => <Card key={post.id}><div className="astrologer-blog-row"><div><span className={`status-badge status-badge--${post.status === 'published' ? 'completed' : 'upcoming'}`}>{post.status === 'published' ? 'Published' : 'Draft'}</span><h3>{post.title}</h3><p className="owner-muted">Updated {formatDate(post.updatedAt)} · {post.readingMinutes} min read · {post.likeCount} likes · {post.commentCount} comments</p></div><Button onClick={() => startEdit(post)} variant="secondary">Edit</Button></div></Card>) : <Card className="home-state"><p>You have not written any posts yet.</p></Card>}
      </div>
      <Dialog onClose={() => setDeleteTarget(null)} open={Boolean(deleteTarget)} title="Delete post?"><div className="stack"><p>This permanently deletes “{deleteTarget?.title}” and its images, likes and comments.</p><div className="dialog__actions"><Button onClick={() => setDeleteTarget(null)} variant="secondary">Keep post</Button><Button onClick={() => void removePost()}>Delete post</Button></div></div></Dialog>
      <Dialog onClose={() => setCommentDeleteTarget(null)} open={Boolean(commentDeleteTarget)} title="Delete comment?"><div className="stack"><p>Delete this comment? This cannot be undone.</p><div className="dialog__actions"><Button onClick={() => setCommentDeleteTarget(null)} variant="secondary">Keep comment</Button><Button disabled={deletingComment} onClick={() => void removeComment()}>{deletingComment ? 'Deleting…' : 'Delete comment'}</Button></div></div></Dialog>
    </div>
  )
}
