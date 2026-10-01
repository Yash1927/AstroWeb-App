import { Card } from './Card'
import { GoogleSignInButton } from './GoogleSignInButton'

type UserSignInProps = {
  description: string
  returnTo: string
}

export function UserSignIn({ description, returnTo }: UserSignInProps) {
  return (
    <Card className="user-sign-in">
      <h2>Continue with Google</h2>
      <p>{description}</p>
      <GoogleSignInButton returnTo={returnTo} />
    </Card>
  )
}

