import { useState } from 'react'
import type { CSSProperties } from 'react'
import {
  Avatar,
  BottomSheet,
  Button,
  Card,
  Dialog,
  Skeleton,
  StatusBadge,
  Toast,
} from '../components'

const colourTokens = [
  '--color-bg',
  '--color-surface',
  '--color-surface-soft',
  '--color-primary',
  '--color-primary-hover',
  '--color-on-primary',
  '--color-text',
  '--color-text-muted',
  '--color-link',
  '--color-border',
  '--color-border-strong',
  '--color-success',
  '--color-success-bg',
  '--color-danger',
  '--color-danger-bg',
] as const

type SwatchStyle = CSSProperties & { '--swatch-color': string }

export default function DesignPage() {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [toastOpen, setToastOpen] = useState(false)
  const [muted, setMuted] = useState(false)
  const [heartAnimation, setHeartAnimation] = useState(0)

  return (
    <main className="design-page screen">
      <h1>Design system</h1>
      <p className="screen__intro">
        Development-only examples of the shared colours, components and motion.
      </p>

      <section className="design-section" aria-labelledby="colours-title">
        <h2 id="colours-title">Colour tokens</h2>
        <ul className="token-list">
          {colourTokens.map((token) => (
            <li className="token-item" key={token}>
              <span
                aria-hidden="true"
                className="token-swatch"
                style={{ '--swatch-color': `var(${token})` } as SwatchStyle}
              />
              <code>{token}</code>
            </li>
          ))}
        </ul>
      </section>

      <section className="design-section" aria-labelledby="buttons-title">
        <h2 id="buttons-title">Buttons and controls</h2>
        <div className="cluster">
          <Button>Primary button</Button>
          <Button variant="secondary">Secondary button</Button>
          <Button variant="text">Text button</Button>
          <Button disabled>Disabled button</Button>
          <button className="chip" type="button">Tomorrow</button>
          <button aria-pressed="true" className="chip" type="button">5:30 PM</button>
        </div>
      </section>

      <section className="design-section" aria-labelledby="cards-title">
        <h2 id="cards-title">Cards and status</h2>
        <div className="design-grid">
          <Card interactive>
            <h3>Astrologer card</h3>
            <p>A shared card with a gentle desktop hover.</p>
            <StatusBadge status="upcoming" />
          </Card>
          <Card>
            <h3>Booking states</h3>
            <div className="cluster">
              <StatusBadge status="completed" />
              <StatusBadge status="missed" />
              <StatusBadge status="phone-call" />
            </div>
          </Card>
        </div>
      </section>

      <section className="design-section" aria-labelledby="navigation-title">
        <h2 id="navigation-title">Bottom tab bar</h2>
        <nav aria-label="Navigation example" className="bottom-tab-bar bottom-tab-bar--preview">
          <span aria-current="page" className="bottom-tab-bar__link">Home</span>
          <span className="bottom-tab-bar__link">History</span>
          <span className="bottom-tab-bar__link">Blogs</span>
          <span className="bottom-tab-bar__link">Settings</span>
        </nav>
      </section>

      <section className="design-section" aria-labelledby="forms-title">
        <h2 id="forms-title">Inputs and selects</h2>
        <div className="design-grid">
          <label className="field">
            <span className="field__label">Your name</span>
            <input className="input" placeholder="Enter your name" />
            <span className="field__hint">Use the name you want us to show.</span>
          </label>
          <label className="field">
            <span className="field__label">Call type</span>
            <select className="select" defaultValue="normal">
              <option value="normal">Normal</option>
              <option value="urgent">Urgent</option>
              <option value="subscription">Subscription</option>
            </select>
          </label>
        </div>
      </section>

      <section className="design-section" aria-labelledby="avatars-title">
        <h2 id="avatars-title">Avatars</h2>
        <div className="cluster">
          <Avatar id="comment-yash" name="Yash Kumar Rastogi" size={32} />
          <Avatar id="list-maya" name="Maya" size={40} />
          <Avatar id="home-anita" name="Anita Sharma" size={56} />
          <Avatar id="call-hindi" name="यश कुमार" size={96} />
        </div>
      </section>

      <section className="design-section" aria-labelledby="overlays-title">
        <h2 id="overlays-title">Sheets, dialogs and toasts</h2>
        <div className="cluster">
          <Button onClick={() => setSheetOpen(true)}>Open bottom sheet</Button>
          <Button onClick={() => setDialogOpen(true)} variant="secondary">
            Open dialog
          </Button>
          <Button onClick={() => setToastOpen(true)} variant="text">
            Show toast
          </Button>
        </div>
      </section>

      <section className="design-section" aria-labelledby="loading-title">
        <h2 id="loading-title">Skeleton loader</h2>
        <Card>
          <div className="stack">
            <Skeleton variant="avatar" />
            <Skeleton variant="title" />
            <Skeleton />
            <Skeleton />
          </div>
        </Card>
      </section>

      <section className="design-section" aria-labelledby="motion-title">
        <h2 id="motion-title">Motion</h2>
        <div className="design-grid">
          <div className="animation-tile">
            <div className="fade-demo">
              <strong>Fade up</strong>
              <p>Screen and message entrance</p>
            </div>
          </div>
          <div className="animation-tile">
            <div>
              <div aria-label="Staggered cards" className="stagger-demo">
                <span className="stagger-demo__card" />
                <span className="stagger-demo__card" />
                <span className="stagger-demo__card" />
              </div>
              <p>Staggered cards</p>
            </div>
          </div>
          <div className="animation-tile">
            <div>
              <div aria-label="Breathing circle" className="breathe-circle" />
              <p>Breathing circle</p>
            </div>
          </div>
          <div className="animation-tile">
            <div>
              <div aria-label="Speaking ring" className="speak-demo">
                <Avatar id="speaker" name="Asha Rao" size={56} />
              </div>
              <p>Speaking ring</p>
            </div>
          </div>
          <div className="animation-tile">
            <div>
              <button
                aria-label={muted ? 'Unmute microphone' : 'Mute microphone'}
                aria-pressed={muted}
                className="call-control"
                onClick={() => setMuted((value) => !value)}
                type="button"
              >
                <span className="call-control__icon" data-visible={!muted}>🎙️</span>
                <span className="call-control__icon" data-visible={muted}>🔇</span>
              </button>
              <p>Call control cross-fade</p>
            </div>
          </div>
          <div className="animation-tile">
            <div>
              <div className="chat-message">I am ready when you are.</div>
              <p>New chat message</p>
            </div>
          </div>
          <div className="animation-tile">
            <div>
              <button
                aria-label="Like this example"
                className="heart-button"
                onClick={() => setHeartAnimation((value) => value + 1)}
                type="button"
              >
                <svg
                  aria-hidden="true"
                  className="heart-button__icon heart-button__icon--popping"
                  key={heartAnimation}
                  viewBox="0 0 24 24"
                >
                  <path d="M12 21s-8-4.8-8-11a4.8 4.8 0 0 1 8-3.5A4.8 4.8 0 0 1 20 10c0 6.2-8 11-8 11Z" />
                </svg>
              </button>
              <p>Heart pop</p>
            </div>
          </div>
          <div className="animation-tile">
            <div>
              <div className="success-mark">
                <svg aria-label="Success" height="40" role="img" viewBox="0 0 40 40" width="40">
                  <path className="success-mark__path" d="m10 21 7 7 14-16" />
                </svg>
              </div>
              <p>Scale in and checkmark</p>
            </div>
          </div>
          <div className="animation-tile">
            <div>
              <Button softGlow>Join now</Button>
              <p>Soft glow</p>
            </div>
          </div>
        </div>
      </section>

      <BottomSheet
        onClose={() => setSheetOpen(false)}
        open={sheetOpen}
        title="Choose a call type"
      >
        <p>Call options will be connected to real settings in a later step.</p>
        <div className="cluster">
          <button className="chip" type="button">Normal</button>
          <button className="chip" type="button">Urgent</button>
        </div>
      </BottomSheet>

      <Dialog
        onClose={() => setDialogOpen(false)}
        open={dialogOpen}
        title="Confirm your choice"
      >
        <p>This is how a calm confirmation dialog will look.</p>
        <Button onClick={() => setDialogOpen(false)}>Confirm</Button>
      </Dialog>

      <Toast
        message="Your changes were saved."
        onDismiss={() => setToastOpen(false)}
        open={toastOpen}
      />
    </main>
  )
}
