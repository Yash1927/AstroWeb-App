import { Avatar } from './Avatar'
import { Button } from './Button'
import { Card } from './Card'

export type AstrologerCardProfile = {
  displayName: string
  expertise: string[]
  experienceYears: number
  id: string
  languages: string[]
}

type AstrologerCardProps = {
  onCall: () => void
  profile: AstrologerCardProfile
}

function listOrFallback(items: string[]) {
  return items.length ? items.join(', ') : 'Not added yet'
}

export function AstrologerCard({ onCall, profile }: AstrologerCardProps) {
  return (
    <Card className="astrologer-card" interactive>
      <div className="astrologer-card__header">
        <Avatar id={profile.id} name={profile.displayName} size={56} />
        <div>
          <h3>{profile.displayName || 'Your display name'}</h3>
          <p className="astrologer-card__experience">
            {profile.experienceYears} {profile.experienceYears === 1 ? 'year' : 'years'} of experience
          </p>
        </div>
      </div>
      <dl className="astrologer-card__details">
        <div>
          <dt>Expertise</dt>
          <dd>{listOrFallback(profile.expertise)}</dd>
        </div>
        <div>
          <dt>Languages</dt>
          <dd>{listOrFallback(profile.languages)}</dd>
        </div>
      </dl>
      <Button className="astrologer-card__call" onClick={onCall}>Call</Button>
    </Card>
  )
}
