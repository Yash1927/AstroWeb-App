import { Avatar } from './Avatar'
import { Button } from './Button'
import { Card } from './Card'

export type AstrologerCardProfile = {
  displayName: string
  expertise: string[]
  experienceYears: number
  id: string
  languages: string[]
  photoUrl?: string | null
}

type AstrologerCardProps = {
  onCall: () => void
  profile: AstrologerCardProfile
}

export function AstrologerCard({ onCall, profile }: AstrologerCardProps) {
  return (
    <Card className="astrologer-card" interactive>
      <div className="astrologer-card__header">
        <Avatar id={profile.id} name={profile.displayName} size={56} src={profile.photoUrl} />
        <div>
          <h3>{profile.displayName || 'Your display name'}</h3>
          <p className="astrologer-card__experience">
            {profile.experienceYears} {profile.experienceYears === 1 ? 'year' : 'years'} of experience
          </p>
        </div>
      </div>
      {profile.expertise.length || profile.languages.length ? (
        <dl className="astrologer-card__details">
          {profile.expertise.length ? (
            <div>
              <dt>Expertise</dt>
              <dd>{profile.expertise.join(', ')}</dd>
            </div>
          ) : null}
          {profile.languages.length ? (
            <div>
              <dt>Languages</dt>
              <dd>{profile.languages.join(', ')}</dd>
            </div>
          ) : null}
        </dl>
      ) : null}
      <Button className="astrologer-card__call" onClick={onCall}>Call</Button>
    </Card>
  )
}
