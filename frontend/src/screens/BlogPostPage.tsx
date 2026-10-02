import { useEffect, useState, type FormEvent } from 'react'
import { Link, useParams } from 'react-router-dom'
import { BlogApiError, blogsApi, type BlogPost } from '../api/blogs'
import { userApi, UserApiError } from '../api/user'
import { Avatar, Button, Card, Dialog, Skeleton, UserSignIn } from '../components'

function formatDate(value: string, includeTime = false) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    ...(includeTime ? { timeStyle: 'short' as const } : {}),
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value))
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
  const [comment, setComment] = useState('')
  const [commentError, setCommentError] = useState('')
  const [commenting, setCommenting] = useState(false)

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
      setComment('')
    } catch (commentFailure) {
      if (commentFailure instanceof BlogApiError && commentFailure.status === 401) {
        setSignedIn(false)
        setSignInOpen(true)
      } else setCommentError(commentFailure instanceof Error ? commentFailure.message : 'The comment could not be posted.')
    } finally { setCommenting(false) }
  }

  const deleteComment = async (commentId: string) => {
    if (!post) return
    try {
      await blogsApi.deleteComment(post.id, commentId)
      setPost({ ...post, comments: post.comments.filter((item) => item.id !== commentId), commentCount: Math.max(0, post.commentCount - 1) })
    } catch (deleteError) {
      setCommentError(deleteError instanceof Error ? deleteError.message : 'The comment could not be deleted.')
    }
  }

  if (loading) return <section className="screen user-screen"><Card aria-busy="true"><Skeleton variant="title" /><Skeleton /><Skeleton /></Card></section>
  if (!post) return <section className="screen user-screen"><Card className="home-state"><h1>Post unavailable</h1><p className="field__error" role="alert">{error}</p><Link className="button button--secondary" to="/blogs">Back to Blogs</Link></Card></section>

  return (
    <article className="screen user-screen blog-post">
      <Link className="button button--text blog-post__back" to="/blogs">← Back to Blogs</Link>
      <header>
        <h1>{post.title}</h1>
        <div className="blog-author">
          <Avatar id={post.author.id} name={post.author.displayName} size={40} />
          <div><strong>{post.author.displayName}</strong><time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time></div>
        </div>
      </header>
      <div className="blog-post__body">
        {post.body.split(/\n\s*\n/u).map((paragraph, index) => <p key={`${index}-${paragraph.slice(0, 12)}`}>{paragraph}</p>)}
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
                <div><p className="blog-comment__meta"><strong>{item.author.firstName}</strong><time dateTime={item.createdAt}>{formatDate(item.createdAt, true)}</time></p><p>{item.body}</p>{item.canDelete ? <Button onClick={() => void deleteComment(item.id)} variant="text">Delete</Button> : null}</div>
              </article>
            ))}
          </div>
        ) : <p className="owner-muted">No comments yet.</p>}
        <form className="blog-comment-form" onSubmit={handleComment}>
          <label className="field"><span className="field__label">Add a comment</span><textarea className="input blog-textarea" maxLength={500} onChange={(event) => setComment(event.target.value)} placeholder="Write up to 500 characters" value={comment} /></label>
          <div className="blog-comment-form__footer"><span className="field__hint">{comment.length}/500</span><Button disabled={commenting} type="submit">{commenting ? 'Posting…' : 'Post comment'}</Button></div>
          {commentError ? <p className="field__error" role="alert">{commentError}</p> : null}
        </form>
      </section>
      <Dialog onClose={() => setSignInOpen(false)} open={signInOpen} title="Continue with Google">
        {signInOpen ? <UserSignIn description="Sign in to like or comment on this post." returnTo={`/blogs/${post.id}`} /> : null}
      </Dialog>
    </article>
  )
}

