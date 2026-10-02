import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { publicApi, type PublicSettings } from '../api/public'
import { Button, Card, Skeleton } from '../components'

export type PolicyPageKind = 'about' | 'contact' | 'pricing' | 'privacy' | 'refunds' | 'shipping' | 'terms'

type PolicyPageProps = { kind: PolicyPageKind }
type StaticPolicy = { intro: string; placeholder: string; title: string }

const staticPolicies: Record<Exclude<PolicyPageKind, 'pricing'>, StaticPolicy> = {
  about: {
    title: 'About us',
    intro: 'This page will explain who runs AstroWebApp and how the service helps people book calls with astrologers.',
    placeholder: '[Owner: add your business name, story and service description here.]',
  },
  contact: {
    title: 'Contact us',
    intro: 'Use the contact details on this page when you need help with the service or a booking.',
    placeholder: '[Owner: add your support email, phone number, business address and support hours here.]',
  },
  privacy: {
    title: 'Privacy policy',
    intro: 'This policy will explain how account, birth and phone details are collected, used, protected and removed.',
    placeholder: '[Owner: write your privacy policy here and have it reviewed before launch.]',
  },
  refunds: {
    title: 'Cancellation and refunds',
    intro: 'This policy will explain cancellation, missed-call and refund rules for each call type.',
    placeholder: '[Owner: write your cancellation and refund policy here.]',
  },
  shipping: {
    title: 'Shipping policy',
    intro: 'Services are delivered online or by phone. Nothing is shipped.',
    placeholder: '[Owner: add any other service-delivery details required by Razorpay here.]',
  },
  terms: {
    title: 'Terms and conditions',
    intro: 'These terms will explain the rules for using AstroWebApp and booking calls.',
    placeholder: '[Owner: write your terms and conditions here and have them reviewed before launch.]',
  },
}

function formatRupees(paise: number) {
  const hasPaise = paise % 100 !== 0
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: hasPaise ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(paise / 100)
}

function PolicyLayout({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="policy-page screen">
      <header className="policy-page__header">
        <p className="policy-page__eyebrow">AstroWebApp</p>
        <h1>{title}</h1>
      </header>
      <div className="policy-page__content">{children}</div>
      <Link className="button button--secondary policy-page__home" to="/">Back to Home</Link>
    </section>
  )
}

function PricingPage() {
  const [settings, setSettings] = useState<PublicSettings | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setSettings(await publicApi.getSettings())
    } catch {
      setError('Pricing is unavailable. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    void publicApi.getSettings()
      .then((loadedSettings) => {
        if (active) setSettings(loadedSettings)
      })
      .catch(() => {
        if (active) setError('Pricing is unavailable. Please try again.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [])

  return (
    <PolicyLayout title="Pricing">
      <p>These are the current prices and call lengths. Changes apply to new bookings only.</p>
      {loading ? (
        <div aria-busy="true" className="policy-price-grid">
          <Card><Skeleton label="Loading Normal call pricing" variant="title" /><Skeleton /></Card>
          <Card><Skeleton label="Loading Urgent call pricing" variant="title" /><Skeleton /></Card>
          <Card><Skeleton label="Loading Subscription pricing" variant="title" /><Skeleton /></Card>
        </div>
      ) : error || !settings ? (
        <Card className="home-state">
          <p className="field__error" role="alert">{error || 'Pricing is unavailable. Please try again.'}</p>
          <Button onClick={() => void load()} variant="secondary">Try again</Button>
        </Card>
      ) : (
        <div className="policy-price-grid">
          <Card>
            <h2>Normal</h2>
            <p className="policy-price">{settings.normalPricePaise === 0 ? 'Free' : formatRupees(settings.normalPricePaise)}</p>
            <p>{settings.normalDurationMin} minutes · Talk inside the app</p>
          </Card>
          <Card>
            <h2>Urgent</h2>
            <p className="policy-price">{formatRupees(settings.urgentPricePaise)} per call</p>
            <p>{settings.urgentDurationMin} minutes · The astrologer calls your phone</p>
          </Card>
          <Card>
            <h2>Subscription</h2>
            <p className="policy-price">
              {formatRupees(settings.subscriptionPricePaise)} for {settings.subscriptionCallsPerPack} calls
            </p>
            <p>{settings.subscriptionDurationMin} minutes each · The astrologer calls your phone</p>
          </Card>
        </div>
      )}
      <p className="policy-placeholder">[Owner: add any taxes or other pricing terms required before launch.]</p>
    </PolicyLayout>
  )
}

export default function PolicyPage({ kind }: PolicyPageProps) {
  if (kind === 'pricing') return <PricingPage />
  const policy = staticPolicies[kind]
  return (
    <PolicyLayout title={policy.title}>
      <p>{policy.intro}</p>
      <p className="policy-placeholder">{policy.placeholder}</p>
    </PolicyLayout>
  )
}
