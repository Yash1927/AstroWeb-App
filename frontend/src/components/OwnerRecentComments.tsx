import { useEffect, useState } from 'react'
import { OwnerApiError, ownerApi, type RecentComment } from '../api/owner'
import { withLowercaseDayPeriod } from '../display-time'
import { Button } from './Button'
import { Card } from './Card'
import { Dialog } from './Dialog'
import { Skeleton } from './Skeleton'

type Props = { onSignedOut: () => void }

function formatDate(value: string) {
  return withLowercaseDayPeriod(new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(value)))
}

export function OwnerRecentComments({ onSignedOut }: Props) {
  const [comments, setComments] = useState<RecentComment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [target, setTarget] = useState<RecentComment | null>(null)

  useEffect(() => {
    let active = true
    ownerApi.getRecentComments().then((loaded) => { if (active) setComments(loaded) }).catch((failure: unknown) => {
      if (!active) return
      if (failure instanceof OwnerApiError && failure.status === 401) onSignedOut()
      else setError(failure instanceof Error ? failure.message : 'Comments are unavailable. Please try again.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [onSignedOut])

  const remove = async () => {
    if (!target) return
    try {
      await ownerApi.deleteComment(target.id)
      setComments((current) => current.filter((comment) => comment.id !== target.id))
      setTarget(null)
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'The comment could not be deleted.') }
  }

  if (loading) return <Card aria-busy="true"><Skeleton variant="title" /><Skeleton /><Skeleton /></Card>
  return <div className="owner-comment-list">{error ? <p className="field__error" role="alert">{error}</p> : null}{comments.length ? comments.map((comment) => <Card key={comment.id}><div className="owner-comment"><div><p><strong>{comment.authorFirstName}</strong> on <strong>{comment.postTitle}</strong></p><p>{comment.body}</p><time dateTime={comment.createdAt}>{formatDate(comment.createdAt)}</time></div><Button onClick={() => setTarget(comment)} variant="text">Delete</Button></div></Card>) : <Card className="home-state"><p>No comments yet.</p></Card>}<Dialog onClose={() => setTarget(null)} open={Boolean(target)} title="Delete comment?"><div className="stack"><p>This comment will be permanently removed.</p><div className="dialog__actions"><Button onClick={() => setTarget(null)} variant="secondary">Keep comment</Button><Button onClick={() => void remove()}>Delete comment</Button></div></div></Dialog></div>
}
