import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BlogApiError, blogsApi, type BlogComment, type BlogPost } from '../api/blogs'
import { userApi, UserApiError } from '../api/user'
import { Avatar, BlogDocument, Button, Card, Dialog, Skeleton, UserSignIn } from '../components'
import { withLowercaseDayPeriod } from '../display-time'

function formatDate(value: string, includeTime = false) {
  return withLowercaseDayPeriod(new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    ...(includeTime ? { timeStyle: 'short' as const } : {}),
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value)))
}

function commentDraftKey(postId: string) {
  return `astrowebapp:blog-comment-draft:${postId}`
}

export default function BlogPostPage() {
  const { id = '' } = useParams()
  const [post, setPost] = useState<BlogPost | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [signedIn, setSignedIn] = useState(false)
  const [signInOpen, setSignInOpen] = useState(false)
  const [liking, setLiking] = useState(false)
  const [heartPopping, setHeartPopping] = useState(false)
  const [commentDraft, setCommentDraft] = useState(() => ({
    postId: id,
    value: sessionStorage.getItem(commentDraftKey(id))?.slice(0, 500) ?? '',
  }))
  const [commentError, setCommentError] = useState('')
  const [commenting, setCommenting] = useState(false)
  const [commentDeleteTarget, setCommentDeleteTarget] = useState<BlogComment | null>(null)
  const [deletingComment, setDeletingComment] = useState(false)

  const comment = commentDraft.postId === id
    ? commentDraft.value
    : sessionStorage.getItem(commentDraftKey(id))?.slice(0, 500) ?? ''

  useEffect(() => {
    let active = true
    Promise.all([
      blogsApi.get(id),
      userApi.getMe().then(() => true).catch((sessionError: unknown) => {
        if (sessionError instanceof UserApiError && sessionError.status === 401) return false
        return false
      }),
    ]).then(([loadedPost, hasSession]) => {
      if (!active) return
      setPost(loadedPost)
      setSignedIn(hasSession)
    }).catch((loadError: unknown) => {
      if (!active) return
      setError(loadError instanceof Error ? loadError.message : 'This post is unavailable.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id])

  const requireSignIn = () => {
    setSignInOpen(true)
    return false
  }

  const updateComment = (value: string) => {
    setCommentDraft({ postId: id, value })
    if (value) sessionStorage.setItem(commentDraftKey(id), value)
    else sessionStorage.removeItem(commentDraftKey(id))
  }

  const handleLike = async () => {
    if (!signedIn) return requireSignIn()
    if (!post || liking) return
    setLiking(true)
    try {
      const result = await blogsApi.toggleLike(post.id)
      setPost({ ...post, likedByViewer: result.liked, likeCount: result.likeCount })
      setHeartPopping(true)
    } catch (likeError) {
      if (likeError instanceof BlogApiError && likeError.status === 401) {
        setSignedIn(false)
        setSignInOpen(true)
      } else setError(likeError instanceof Error ? likeError.message : 'The like could not be saved.')
    } finally { setLiking(false) }
  }

  const handleComment = async (event: FormEvent) => {
    event.preventDefault()
    if (!signedIn) return requireSignIn()
    const body = comment.trim()
    if (!body) { setCommentError('Write a comment first.'); return }
    if (!post) return
    setCommenting(true)
    setCommentError('')
    try {
      const created = await blogsApi.comment(post.id, body)
      setPost({ ...post, comments: [...post.comments, created], commentCount: post.commentCount + 1 })
      updateComment('')
    } catch (commentFailure) {
      if (commentFailure instanceof BlogApiError && commentFailure.status === 401) {
        setSignedIn(false)
        setSignInOpen(true)
      } else setCommentError(commentFailure instanceof Error ? commentFailure.message : 'The comment could not be posted.')
    } finally { setCommenting(false) }
  }

  const deleteComment = async () => {
    if (!post || !commentDeleteTarget || deletingComment) return
    setDeletingComment(true)
    try {
      await blogsApi.deleteComment(post.id, commentDeleteTarget.id)
      setPost({ ...post, comments: post.comments.filter((item) => item.id !== commentDeleteTarget.id), commentCount: Math.max(0, post.commentCount - 1) })
      setCommentDeleteTarget(null)
    } catch (deleteError) {
      setCommentError(deleteError instanceof Error ? deleteError.message : 'The comment could not be deleted.')
    } finally { setDeletingComment(false) }
  }

  if (loading) return <section className="screen user-screen"><Card aria-busy="true"><Skeleton variant="title" /><Skeleton /><Skeleton /></Card></section>
  if (!post) return <section className="screen user-screen"><Card className="home-state"><h1>Post unavailable</h1><p className="field__error" role="alert">{error}</p><Link className="button button--secondary" to="/blogs">Back to Blogs</Link></Card></section>

  return (
    <article className="screen user-screen blog-post">
      <Link className="button button--text blog-post__back" to="/blogs">← Back to Blogs</Link>
      <header>
        <h1>{post.title}</h1>
        <div className="blog-author">
          <Avatar id={post.author.id} name={post.author.displayName} size={40} src={post.author.photoUrl} />
          <div><strong>{post.author.displayName}</strong><time dateTime={post.publishedAt}>{formatDate(post.publishedAt)} · {post.readingMinutes} min read</time></div>
        </div>
      </header>
      <div className="blog-post__body">
        <BlogDocument document={post.body} />
      </div>
      <div className="blog-post__reaction">
        <button
          aria-label={post.likedByViewer ? 'Unlike this post' : 'Like this post'}
          aria-pressed={post.likedByViewer}
          className="blog-like-button"
          disabled={liking}
          onClick={() => void handleLike()}
          type="button"
        >
          <span className={heartPopping ? 'blog-like-button__heart blog-like-button__heart--popping' : 'blog-like-button__heart'} onAnimationEnd={() => setHeartPopping(false)}>{post.likedByViewer ? '♥' : '♡'}</span>
          <span>{post.likeCount} {post.likeCount === 1 ? 'like' : 'likes'}</span>
        </button>
      </div>
      <section aria-labelledby="comments-heading" className="blog-comments">
        <h2 id="comments-heading">Comments</h2>
        {post.comments.length ? (
          <div className="blog-comment-list">
            {post.comments.map((item) => (
              <article className="blog-comment" key={item.id}>
                <Avatar id={item.author.avatarId} name={item.author.firstName} size={32} />
                <div><p className="blog-comment__meta"><strong>{item.author.firstName}</strong><time dateTime={item.createdAt}>{formatDate(item.createdAt, true)}</time></p><p>{item.body}</p>{item.canDelete ? <Button onClick={() => setCommentDeleteTarget(item)} variant="text">Delete</Button> : null}</div>
              </article>
            ))}
          </div>
        ) : <p className="owner-muted">No comments yet.</p>}
        <form className="blog-comment-form" onSubmit={handleComment}>
          <label className="field"><span className="field__label">Add a comment</span><textarea className="input blog-textarea" maxLength={500} onChange={(event) => updateComment(event.target.value)} placeholder="Write up to 500 characters" value={comment} /></label>
          <div className="blog-comment-form__footer"><span className="field__hint">{comment.length}/500</span><Button disabled={commenting} type="submit">{commenting ? 'Posting…' : 'Post comment'}</Button></div>
          {commentError ? <p className="field__error" role="alert">{commentError}</p> : null}
        </form>
      </section>
      <Dialog onClose={() => setSignInOpen(false)} open={signInOpen} title="Continue with Google">
        {signInOpen ? <UserSignIn description="Sign in to like or comment on this post." returnTo={`/blogs/${post.id}`} /> : null}
      </Dialog>
      <Dialog onClose={() => setCommentDeleteTarget(null)} open={Boolean(commentDeleteTarget)} title="Delete comment?">
        <div className="stack">
          <p>Delete your comment? This cannot be undone.</p>
          <div className="dialog__actions">
            <Button onClick={() => setCommentDeleteTarget(null)} variant="secondary">Keep comment</Button>
            <Button disabled={deletingComment} onClick={() => void deleteComment()}>{deletingComment ? 'Deleting…' : 'Delete comment'}</Button>
          </div>
        </div>
      </Dialog>
    </article>
  )
}
