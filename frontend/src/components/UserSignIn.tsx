import { Card } from './Card'
import { GoogleSignInButton } from './GoogleSignInButton'
import { AppBrand } from './AppBrand'

type UserSignInProps = {
  description: string
  returnTo: string
}

export function UserSignIn({ description, returnTo }: UserSignInProps) {
  return (
    <Card className="user-sign-in">
      <AppBrand large />
      <h2>Continue with Google</h2>
      <p>{description}</p>
      <GoogleSignInButton returnTo={returnTo} />
    </Card>
  )
}
