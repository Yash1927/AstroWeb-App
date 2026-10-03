import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { publicApi, type PublicSettings } from '../api/public'
import { Button, Card, PageHeader, Skeleton } from '../components'

export type PolicyPageKind = 'about' | 'contact' | 'pricing' | 'privacy' | 'refunds' | 'shipping' | 'terms'

type PolicyPageProps = { kind: PolicyPageKind }

const LAST_UPDATED = '2026-10-03'

function formatRupees(paise: number) {
  const hasPaise = paise % 100 !== 0
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR',
    minimumFractionDigits: hasPaise ? 2 : 0, maximumFractionDigits: 2,
  }).format(paise / 100)
}

function PolicyLayout({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="policy-page screen">
      <PageHeader title={title} />
      <div className="policy-page__content">
        <p className="policy-page__eyebrow">Last updated: {LAST_UPDATED}</p>
        {children}
      </div>
      <Link className="button button--secondary policy-page__home" to="/">Back to Home</Link>
    </section>
  )
}

function PolicySection({ children, title }: { children: ReactNode; title: string }) {
  return <section><h2>{title}</h2>{children}</section>
}

function BusinessDetails() {
  return (
    <ul>
      <li>Service operator and legal business name: Shashank Pokhariyal</li>
      <li>Registered address: [OWNER: registered address]</li>
      <li>Customer-care email: [OWNER: support email]</li>
      <li>Customer-care phone: [OWNER: support phone]</li>
      <li>GSTIN: [OWNER: GSTIN if any]</li>
    </ul>
  )
}

function GrievanceDetails() {
  return (
    <>
      <p>Grievance Officer: Shashank Pokhariyal</p>
      <p>Email: [OWNER: support email]</p>
      <p>Address: [OWNER: registered address]</p>
      <p>Phone: [OWNER: support phone]</p>
      <p>We will acknowledge a consumer complaint within 48 hours and resolve it within one month from receipt.</p>
    </>
  )
}

function TermsPage() {
  return (
    <PolicyLayout title="Terms and conditions">
      <p>These terms govern your use of Astromaitreyi, a service operated by Shashank Pokhariyal. By using the app, creating an account or booking a call, you agree to these terms.</p>

      <PolicySection title="Eligibility">
        <p>You must be at least 18 years old and able to enter into a valid contract under Indian law. Do not use another person’s identity or account.</p>
      </PolicySection>

      <PolicySection title="The service">
        <p>Astromaitreyi helps users find astrologers, view available times, book consultations, read blogs and participate in blog discussions.</p>
        <ul>
          <li>Normal calls are free audio calls inside the app.</li>
          <li>Urgent calls are paid phone calls. The astrologer calls the number saved in your account at the booked time.</li>
          <li>Subscription is a one-time pack of call credits. It does not renew automatically. A Subscription call is delivered by phone and uses one credit.</li>
        </ul>
        <p>Astrologers provide consultations as independent consultants and are not employees of Astromaitreyi. Their views and advice are their own.</p>
      </PolicySection>

      <PolicySection title="Important disclaimer">
        <p>Astrology is guidance and entertainment. It is not a substitute for medical, legal, financial or psychological advice, diagnosis or treatment. Do not delay professional help or make urgent health, safety, legal or financial decisions only because of an astrology consultation or blog post.</p>
        <p>No prediction or outcome is guaranteed. If you are in immediate danger or distress, contact the appropriate emergency or qualified professional service.</p>
      </PolicySection>

      <PolicySection title="Your account">
        <p>User accounts use Google sign-in. Keep access to your Google account and device secure. Provide accurate information, including your name and birth details. A phone number is required for Urgent and Subscription calls and must belong to you or be one you are authorised to use.</p>
        <p>You are responsible for activity through your account. Tell us promptly if you believe it has been used without permission. We may restrict access where needed to protect users, prevent misuse or comply with law.</p>
      </PolicySection>

      <PolicySection title="Bookings and payments">
        <p>Available times, call length and the price payable are shown before you confirm. Prices are in Indian rupees and come from the app’s current settings. A paid time is held for 10 minutes while payment is completed.</p>
        <p>Payments are processed by Razorpay. Astromaitreyi verifies the payment on the server before confirming a paid booking or adding Subscription credits. A confirmation is subject to the time still being available. The Cancellation and refunds policy forms part of these terms.</p>
      </PolicySection>

      <PolicySection title="Acceptable use">
        <p>Use the service respectfully and lawfully. You must not harass, threaten or impersonate anyone; share unlawful, abusive, discriminatory, deceptive or sexually explicit material; attempt to obtain another person’s account or private information; interfere with the app; evade security or rate limits; upload malicious files; or use the service for fraud.</p>
      </PolicySection>

      <PolicySection title="Blogs and comments">
        <p>Astrologers are responsible for their posts. Users are responsible for their comments. Keep comments relevant and respectful, and do not publish private information about yourself or anyone else.</p>
        <p>A commenter may delete their own comment. The post’s astrologer and the owner may also remove comments. Posts or comments may be removed when they breach these terms, create safety or legal concerns, or are no longer offered.</p>
      </PolicySection>

      <PolicySection title="Availability and changes">
        <p>We may update the service, availability, prices or these terms. Price changes apply only to new bookings. Existing bookings keep the price and call length recorded when they were made.</p>
      </PolicySection>

      <PolicySection title="Liability">
        <p>To the extent permitted by law, Astromaitreyi is not responsible for decisions made from a consultation or blog post, or for indirect or consequential loss. We do not guarantee uninterrupted access, a particular astrological result, or the accuracy of an astrologer’s opinion.</p>
        <p>Nothing in these terms excludes liability that cannot lawfully be excluded, or limits rights available to consumers under applicable law.</p>
      </PolicySection>

      <PolicySection title="Governing law">
        <p>These terms are governed by the laws of India. Subject to any consumer forum or other forum available by law, courts at [OWNER: city for jurisdiction], India will have jurisdiction.</p>
      </PolicySection>

      <PolicySection title="Business and grievance details">
        <BusinessDetails />
        <GrievanceDetails />
      </PolicySection>
    </PolicyLayout>
  )
}

function PrivacyPage() {
  return (
    <PolicyLayout title="Privacy policy">
      <p>Shashank Pokhariyal operates Astromaitreyi and is responsible for the personal data described in this policy. We handle personal data in line with applicable Indian law, including the Digital Personal Data Protection Act, 2023, the Information Technology Act, 2000 and the Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011.</p>

      <PolicySection title="Data we collect">
        <ul>
          <li>Google sign-in data: Google account identifier, verified email and the name Google provides.</li>
          <li>Profile data: your chosen name, birth date, birth time, birth place, gender and optional phone number.</li>
          <li>Booking data: astrologer, call type, time, price, status, and whether participants joined an in-app call.</li>
          <li>Payment records: Razorpay order and payment identifiers, amount, purpose and payment status. We do not receive or store your full card, bank-account or UPI credentials.</li>
          <li>Community data: blog likes and comments you choose to post.</li>
          <li>Security data: signed session identifiers and limited network information, including IP address, used for authentication, abuse prevention and rate limits.</li>
          <li>Astrologer data: account, profile, availability, booking, blog and uploaded-image information needed to provide the panel and public listings.</li>
        </ul>
        <p>We treat birth details as sensitive because they are private and can reveal personal information. Please provide them only when you want to use the booking service.</p>
      </PolicySection>

      <PolicySection title="Why we use data">
        <p>We use data to sign you in, maintain your account, show suitable booking flows, calculate and reserve available times, deliver calls, process and reconcile payments, show booking history, operate blogs, prevent abuse, secure the service, answer support requests and meet legal obligations.</p>
        <p>Your phone number is not used for marketing. It is used for a booked Urgent or Subscription phone call, shown only to the astrologer you booked, and may be sent to Razorpay as checkout prefill when payment is required.</p>
      </PolicySection>

      <PolicySection title="Cookies and sessions">
        <p>Astromaitreyi uses essential cookies for Google sign-in protection and signed-in sessions. Session cookies are httpOnly, SameSite=Lax and Secure in production. User sessions last up to 30 days. Astrologer and owner sessions last up to 12 hours. Logging out deletes the current server session. An expired session is deleted when it is next checked.</p>
        <p>The app may store a small preference on your device when you dismiss installation guidance. It is not used for advertising or cross-site tracking.</p>
      </PolicySection>

      <PolicySection title="Who processes data">
        <p>We use service providers only where needed to operate Astromaitreyi:</p>
        <ul>
          <li>Google Identity Services for user sign-in.</li>
          <li>Razorpay for payment checkout, processing, verification and refunds.</li>
          <li>Neon for the application database.</li>
          <li>Cloudflare R2 for public astrologer profile photos and blog images.</li>
          <li>Our hosting provider for delivery of the app, API and WebSocket service.</li>
        </ul>
        <p>We may also disclose data where required by law, to protect users or the service, or as part of a lawful business transfer. Providers may process data from locations outside India, subject to applicable law and their contractual safeguards.</p>
      </PolicySection>

      <PolicySection title="Retention and deletion">
        <p>We keep account, profile, booking, payment and community records while they are needed to provide the service, handle disputes and meet tax, accounting, fraud-prevention or other legal duties. A final fixed retention period for these records has not yet been adopted.</p>
        <p>Deleted comments and posts stop being available through the app. Replaced or removed astrologer images are deleted from storage. Unused uploaded images are deleted after they have been unreferenced for more than 24 hours and the scheduled cleanup runs.</p>
        <p>The app does not currently provide an automatic Delete account button. You can correct profile data in Settings. To request access, correction or deletion, use the Contact us link in Settings or email [OWNER: support email]. We will verify the request and delete eligible data, while retaining anything the law or an unresolved transaction or dispute requires us to keep.</p>
      </PolicySection>

      <PolicySection title="Your choices and rights">
        <p>Subject to applicable law, you may ask for a summary of your personal data and processing, correction or completion of inaccurate data, deletion of eligible data, withdrawal of consent, and grievance redressal. Withdrawing consent does not affect processing already carried out lawfully and may prevent us from continuing services that need the data.</p>
      </PolicySection>

      <PolicySection title="Children">
        <p>Astromaitreyi is for adults aged 18 or older. We do not knowingly offer accounts or consultations to children. If you believe a child has provided personal data, contact us so we can review and delete it where appropriate.</p>
      </PolicySection>

      <PolicySection title="Security">
        <p>We use access controls, server-side sessions, encryption in transit, restricted origins, validation, rate limits and limited logging. Images are checked and re-encoded before storage. No online service can promise complete security, so please protect your device and Google account and tell us about suspected misuse.</p>
      </PolicySection>

      <PolicySection title="Contact and privacy grievances">
        <GrievanceDetails />
      </PolicySection>
    </PolicyLayout>
  )
}

function RefundsPage() {
  return (
    <PolicyLayout title="Cancellation and refunds">
      <p>This policy applies to bookings and Subscription packs made through Astromaitreyi.</p>

      <PolicySection title="Cancellations">
        <p>The app does not currently allow users to cancel or reschedule a confirmed booking. Changing an astrologer’s availability does not cancel an existing booking.</p>
      </PolicySection>

      <PolicySection title="Normal calls">
        <p>Normal calls are free, so there is no payment to refund. A user may have only one upcoming Normal booking at a time.</p>
      </PolicySection>

      <PolicySection title="Urgent calls and Subscription packs">
        <p>Urgent calls are paid per call. Subscription is a one-time purchase of call credits, is not auto-renewing, works with any astrologer and does not expire. Each confirmed Subscription booking uses one credit.</p>
        <p>A paid time is held for 10 minutes while checkout is completed. Closing checkout does not complete the booking. If a payment fails and money was deducted, reversal timing is controlled by Razorpay, the payment network and your bank.</p>
      </PolicySection>

      <PolicySection title="Automatic slot-conflict refunds">
        <p>If payment succeeds after the 10-minute hold has expired and another person has taken the time, the booking cannot be confirmed. Astromaitreyi automatically asks Razorpay to refund the payment collected for that booking.</p>
      </PolicySection>

      <PolicySection title="Missed calls">
        <p>If you miss or do not answer a booked call, there is no automatic refund. A Subscription call still uses its credit.</p>
        <p>If the astrologer does not call or join, contact customer care with the booking details. The current app does not issue an automatic refund or automatically restore a Subscription credit for this case. The owner will review the request. Any approved monetary refund is made manually through the Razorpay Dashboard.</p>
      </PolicySection>

      <PolicySection title="Refund timing">
        <p>Approved refunds are returned to the original payment method. After Razorpay initiates a normal refund, it usually appears within 5–7 working days. Your bank or payment provider may take longer. We cannot credit a refund to a different account or payment method.</p>
      </PolicySection>

      <PolicySection title="Request help">
        <p>Email [OWNER: support email] or call [OWNER: support phone] with your booking reference and a short explanation. Do not send card, bank-account, UPI PIN or one-time-password details.</p>
        <GrievanceDetails />
      </PolicySection>
    </PolicyLayout>
  )
}

function ShippingPage() {
  return (
    <PolicyLayout title="Shipping policy">
      <p>Astromaitreyi provides digital consultation services. Nothing is shipped and there are no delivery charges.</p>
      <PolicySection title="How the service is delivered">
        <ul>
          <li>A Normal consultation is delivered as an audio call inside the app at the booked time.</li>
          <li>An Urgent or Subscription consultation is delivered by phone. The astrologer calls the number saved in your account at the booked time.</li>
          <li>Subscription credits are added to your account after a successful pack payment. One credit is used for the Subscription booking made during that purchase.</li>
        </ul>
      </PolicySection>
      <PolicySection title="When delivery happens">
        <p>Your booking confirmation and History show the scheduled time in IST. You are responsible for being available, having a working internet connection for an in-app call, and keeping the saved phone reachable for a phone call.</p>
      </PolicySection>
      <PolicySection title="Delivery help">
        <p>If the service was not delivered, contact [OWNER: support email] or [OWNER: support phone]. The Cancellation and refunds policy explains the current refund process.</p>
      </PolicySection>
    </PolicyLayout>
  )
}

function ContactPage() {
  return (
    <PolicyLayout title="Contact us">
      <p>Contact us for help with an account, booking, payment, refund, privacy request, blog concern or complaint. Never send passwords, payment PINs or one-time passwords.</p>
      <PolicySection title="Business and customer care"><BusinessDetails /></PolicySection>
      <PolicySection title="Grievance Officer">
        <GrievanceDetails />
        <p>Include your name, booking reference if relevant, a clear description and the result you are seeking. We may ask for enough information to verify your identity before discussing account or payment data.</p>
      </PolicySection>
    </PolicyLayout>
  )
}

function AboutPage() {
  return (
    <PolicyLayout title="About us">
      <p>Astromaitreyi is operated by Shashank Pokhariyal. It helps adults browse astrologers, view available times and book calm, private consultations.</p>
      <PolicySection title="What we offer">
        <p>Normal consultations are free audio calls inside the app. Urgent consultations and calls booked with Subscription credits are phone calls from the selected astrologer at the scheduled time. Astrologers can also publish educational blog posts, and signed-in users can like and comment on them.</p>
      </PolicySection>
      <PolicySection title="Our approach">
        <p>We aim to make booking clear and unhurried. Prices and call lengths are shown before confirmation. Astrology is offered as guidance, not as professional medical, legal, financial or psychological advice.</p>
      </PolicySection>
      <PolicySection title="Business details"><BusinessDetails /></PolicySection>
    </PolicyLayout>
  )
}

function PricingPage() {
  const [settings, setSettings] = useState<PublicSettings | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true); setError('')
    try { setSettings(await publicApi.getSettings()) }
    catch { setError('Pricing is unavailable. Please try again.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    let active = true
    void publicApi.getSettings()
      .then((loadedSettings) => { if (active) setSettings(loadedSettings) })
      .catch(() => { if (active) setError('Pricing is unavailable. Please try again.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  return (
    <PolicyLayout title="Pricing">
      <p>All prices are shown in Indian rupees before payment and are inclusive of applicable taxes, if any. The current prices and call lengths below are read from the app’s live settings. Changes apply to new bookings only.</p>
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
          <Card><h2>Normal</h2><p className="policy-price">{settings.normalPricePaise === 0 ? 'Free' : formatRupees(settings.normalPricePaise)}</p><p>{settings.normalDurationMin} minutes · Talk inside the app</p></Card>
          <Card><h2>Urgent</h2><p className="policy-price">{formatRupees(settings.urgentPricePaise)} per call</p><p>{settings.urgentDurationMin} minutes · The astrologer calls your phone</p></Card>
          <Card><h2>Subscription</h2><p className="policy-price">{formatRupees(settings.subscriptionPricePaise)} for {settings.subscriptionCallsPerPack} calls</p><p>{settings.subscriptionDurationMin} minutes each · The astrologer calls your phone</p></Card>
        </div>
      )}
      <PolicySection title="How pricing works">
        <p>Normal calls are free. Urgent calls are paid per call. Subscription is a one-time pack, does not renew automatically, works with any astrologer and does not expire. Each Subscription booking uses one credit.</p>
        <p>A paid time is held for 10 minutes during checkout. Razorpay processes the payment. If a late successful payment cannot be confirmed because the time was taken after the hold expired, Astromaitreyi automatically requests a refund.</p>
        <p>GSTIN: [OWNER: GSTIN if any]</p>
      </PolicySection>
    </PolicyLayout>
  )
}

export default function PolicyPage({ kind }: PolicyPageProps) {
  if (kind === 'about') return <AboutPage />
  if (kind === 'contact') return <ContactPage />
  if (kind === 'pricing') return <PricingPage />
  if (kind === 'privacy') return <PrivacyPage />
  if (kind === 'refunds') return <RefundsPage />
  if (kind === 'shipping') return <ShippingPage />
  return <TermsPage />
}
