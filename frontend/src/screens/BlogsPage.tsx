import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { blogsApi, type BlogSummary } from '../api/blogs'
import { Avatar, Button, Card, Skeleton } from '../components'

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value))
}

export default function BlogsPage() {
  const [posts, setPosts] = useState<BlogSummary[]>([])
  const [nextPage, setNextPage] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')

  const load = async (page: number, more = false) => {
    if (more) setLoadingMore(true)
    else setLoading(true)
    setError('')
    try {
      const result = await blogsApi.list(page)
      setPosts((current) => more ? [...current, ...result.posts] : result.posts)
      setNextPage(result.nextPage)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Blogs are unavailable. Please try again.')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  useEffect(() => {
    let active = true
    blogsApi.list(1).then((result) => {
      if (!active) return
      setPosts(result.posts)
      setNextPage(result.nextPage)
    }).catch((loadError: unknown) => {
      if (active) setError(loadError instanceof Error ? loadError.message : 'Blogs are unavailable. Please try again.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  return (
    <section className="screen user-screen blog-screen">
      <header className="blog-header">
        <p className="owner-eyebrow">AstroWebApp</p>
        <h1>Blogs</h1>
        <p className="screen__intro">Thoughtful guidance from our astrologers.</p>
      </header>
      {loading ? (
        <div aria-busy="true" className="blog-list">
          {[0, 1, 2].map((item) => (
            <Card className="blog-card" key={item}>
              <Skeleton variant="title" /><Skeleton /><Skeleton />
            </Card>
          ))}
        </div>
      ) : error && posts.length === 0 ? (
        <Card className="home-state">
          <p className="field__error" role="alert">{error}</p>
          <Button onClick={() => void load(1)} variant="secondary">Try again</Button>
        </Card>
      ) : posts.length === 0 ? (
        <Card className="home-state"><p>No blog posts are available right now.</p></Card>
      ) : (
        <div className="blog-list">
          {posts.map((post) => (
            <article className="card card--interactive blog-card" key={post.id}>
              <Link className="blog-card__link" to={`/blogs/${post.id}`}>
                <h2>{post.title}</h2>
                <div className="blog-author">
                  <Avatar id={post.author.id} name={post.author.displayName} size={40} />
                  <div><strong>{post.author.displayName}</strong><time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time></div>
                </div>
                <p className="blog-card__excerpt">{post.excerpt}</p>
                <p className="blog-counts" aria-label={`${post.likeCount} likes and ${post.commentCount} comments`}>
                  <span>♡ {post.likeCount}</span><span>Comments {post.commentCount}</span>
                </p>
              </Link>
            </article>
          ))}
          {error ? <p className="field__error" role="alert">{error}</p> : null}
          {nextPage ? (
            <Button disabled={loadingMore} onClick={() => void load(nextPage, true)} variant="secondary">
              {loadingMore ? 'Loading…' : 'Load more'}
            </Button>
          ) : null}
        </div>
      )}
    </section>
  )
}

