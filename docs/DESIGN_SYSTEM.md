# Design system

The UI as built: tokens, components, animations, screens and wording. In code, the source of truth is `frontend/src/design.css`, created in Step 1. The spec is README §10.

Last updated: 2026-10-01

## Tokens

| Token | Value | Used for |
|---|---|---|
| `--color-bg` | `#FFFBEB` | Page background |
| `--color-surface` | `#FFFFFF` | Cards, overlays and inputs |
| `--color-surface-soft` | `#FFF3C4` | Selected chips and highlights |
| `--color-primary` | `#F5C542` | Primary button and active-tab backgrounds |
| `--color-primary-hover` | `#EDB82E` | Primary button hover |
| `--color-on-primary` | `#2B2111` | Text on primary backgrounds |
| `--color-text` | `#2B2111` | Main text |
| `--color-text-muted` | `#6B5A3A` | Supporting text |
| `--color-link` | `#8A5A00` | Links and focus rings |
| `--color-border`, `--color-border-strong` | `#EFE2B8`, `#A08445` | Decorative and control borders |
| `--color-success`, `--color-success-bg` | `#1F6B3F`, `#E6F4EA` | Success status |
| `--color-danger`, `--color-danger-bg` | `#A8261B`, `#FDECEA` | Errors and missed status |
| `--color-backdrop`, `--color-primary-glow-*` | Translucent token colours | Modal backdrops and the live-call glow |
| `--color-avatar-1` … `--color-avatar-6` | README §5.6 warm palette | Stable initial avatars |
| `--font-body` | Nunito with system fallbacks | All app text |
| `--text-sm` … `--text-2xl` | `0.875rem` … `1.75rem` | Type scale |
| `--space-1` … `--space-12` | 4px steps from 4px to 48px | Layout spacing |
| `--radius-sm` … `--radius-full` | 8px to fully rounded | Controls, cards and avatars |
| `--shadow-card`, `--shadow-raised` | Soft warm shadows | Cards and overlays |
| `--tap-min` | 48px | Minimum interactive target |
| `--dur-*`, `--ease-*`, `--stagger-step` | README §10.2 and §10.4 timings | All transitions and animation |

## Components

| Component | File | Variants / props | Used on |
|---|---|---|---|
| Button | `frontend/src/components/Button.tsx` | Primary, secondary, text, disabled, optional soft glow | User screens, design page and both panels |
| Card | `frontend/src/components/Card.tsx` | Default, compact, interactive hover | User screens, panels, placeholders and design page |
| Avatar | `frontend/src/components/Avatar.tsx` | 32, 40, 56 and 96px; stable id-hashed colour | Settings, astrologer cards, owner list/profile and design page |
| AstrologerCard | `frontend/src/components/AstrologerCard.tsx` | 56px avatar, name, expertise, languages, experience, full-width Call action and desktop hover | Home, astrologer preview and design page |
| BottomSheet | `frontend/src/components/BottomSheet.tsx` | Body portal, labelled modal, backdrop, close button, Escape key | Home call-type picker and design page |
| Dialog | `frontend/src/components/Dialog.tsx` | Body portal, labelled modal, backdrop, close button, Escape key | Owner forms, astrologer preview and design page |
| Toast | `frontend/src/components/Toast.tsx` | Body portal; success or error; live region; closes after four seconds | Panel action feedback; design page |
| Skeleton | `frontend/src/components/Skeleton.tsx` | Text, title and avatar | Home cards, panel authentication/data loading and design page |
| StatusBadge | `frontend/src/components/StatusBadge.tsx` | Upcoming, Completed, Missed, Phone call | Design page |
| GoogleSignInButton / UserSignIn | `frontend/src/components/GoogleSignInButton.tsx`, `UserSignIn.tsx` | GIS standard “Continue with Google” button in redirect mode plus a calm sign-in card | Home booking flow, History and Settings |
| UserDetailsForm | `frontend/src/components/UserDetailsForm.tsx` | Name, date, local time with 12-hour reading, place, optional phone, gender, field errors and privacy line | First booking and Settings |
| Inputs, selects and tags | `frontend/src/design.css` | Label, hint, linked error, input, read-only input, rupee input, select, tag editor and removable tags | User forms, panel forms and design page |
| Chips | `frontend/src/design.css` | Default and selected | Panel section navigation and design page |
| Bottom tab bar | `frontend/src/App.tsx` | Home, History, Blogs and Settings; gold active tab | User app shell and design preview |
| Call control | `frontend/src/design.css` | Pressed and icon cross-fade states | Design page; call room comes later |

## Animations

| Name | Duration and easing | Where it's used | With reduced motion |
|---|---|---|---|
| `fade-up` | 240ms, ease out | Every screen and design demos | Reduced to 1ms once |
| Staggered `fade-up` | 40ms between items | First six Home cards and design example | Delay remains but movement is 1ms once |
| Button press | 120ms | All buttons shrink to 0.97 while pressed | Transition reduced to 1ms |
| Card hover | 200ms | Interactive cards on hover-capable devices | Transition reduced to 1ms |
| `sheet-up` / `sheet-down` | 300ms in, 200ms out | Bottom sheet | Reduced to 1ms once |
| `scale-in` / `scale-out` | 200–300ms | Dialogs and success mark | Reduced to 1ms once |
| `shimmer` | 1.4s linear loop | Skeleton loader | Runs once for 1ms |
| `breathe` | 8s loop | Waiting-circle example | Runs once for 1ms |
| `speak-ring` | 1.2s loop | Speaking-avatar example | Runs once for 1ms |
| Icon cross-fade | 150ms | Call control | Transition reduced to 1ms |
| `message-in` | 180ms | Chat-message example | Reduced to 1ms once |
| `heart-pop` | 300ms | Like example | Reduced to 1ms once |
| Toast in / out | 220ms / 180ms | Toast component | Reduced to 1ms once |
| `check-draw` | 450ms after 300ms scale-in | Success example | Reduced to 1ms once |
| `soft-glow` | 2.4s loop | Live Join now example | Runs once for 1ms |

## Screens

| Screen | Route | States (loading, empty, error, …) | Built in step |
|---|---|---|---|
| Home | `/` | Public skeleton/error/empty/list states; call type; session check; Google sign-in; missing details; phone-only step; Step 7 placeholder | 5, 6 |
| History | `/history` | Session loading/error, signed-out Google screen, signed-in Step 9 placeholder | 6 |
| Blogs | `/blogs` | Placeholder | 1 |
| Blog post | `/blogs/:id` | Later-step placeholder | 1 |
| Settings | `/settings` | Session loading/error, signed-out Google screen, profile avatar, read-only email, editable details, policy links, save toast and logout | 6 |
| Call room | `/call/:bookingId` | Later-step placeholder | 1 |
| Policy pages | `/terms`, `/privacy`, `/refunds`, `/shipping`, `/contact`, `/about`, `/pricing` | Later-step placeholder | 1 |
| Astrologer panel | `/astrologer` | Session check, login, forced password change, profile load/error/edit/preview/save; later-step section placeholders | 4 |
| Owner panel | `/owner` | Session check, login, loading, empty, error, astrologer management and pricing/settings | 3 |
| Design system | `/_design` | Development only; absent from production code | 1 |
| Not found | Any unmatched path | Link back to Home | 1 |

## Wording

Messages shown in the UI, so the same situation always uses the same words.

| Situation | Text | Where |
|---|---|---|
| Later feature route or panel section | “Coming in a later step.” | Call, blog post, policies, Availability, Bookings and astrologer Blogs |
| Unknown route | “This page does not exist.” | Not-found screen |
| Design success toast | “Your changes were saved.” | Development design page |
| Owner login error | “The email or password is incorrect.” | Owner login |
| Settings scope | “Changes apply to new bookings only.” | Owner pricing and call settings |
| Temporary password hint | “At least 10 characters. Share it securely.” | Add astrologer |
| Empty owner list | “No astrologers yet” | Owner astrologer section |
| Forced password heading | “Set a new password” | First astrologer login and owner-reset login |
| Profile context | “This information appears on your Home card.” | Astrologer profile |
| Preview context | “This preview uses your unsaved changes.” | Astrologer profile preview |
| Empty Home list | “No astrologers are available right now. Please check again later.” | Home |
| Private-details note | “Your details are private. Only the astrologer you book can see them.” | First booking details and Settings |
| Deferred time choice | “Choosing a time comes in the next step” | Home after sign-in and required details |
| Settings save | “Saved” | Settings toast |

## Accessibility

- The README §10 colour tokens are used without changing their contrast pairings. Golden is used only as a background.
- All focusable elements receive the specified 3px `--color-link` focus ring.
- Current interactive targets have a minimum rendered size of 48×48px.
- Body type starts at `1rem`, uses a 1.6 line height, and text containers do not use fixed heights.
- Bottom sheets and dialogs have names, modal semantics, close buttons, backdrop dismissal and Escape handling. Closed overlays are inert.
- Dialog and BottomSheet focus the close control once when they open. Re-rendering controlled form fields does not steal focus; their Escape listeners call the latest close callback.
- Dialog, BottomSheet and Toast use React portals into `document.body`, so a transformed screen animation cannot confine their fixed positioning to the page column.
- Owner settings validation places a specific error beside every invalid field and links it with `aria-describedby` and `aria-invalid`.
- Astrologer password and profile validation use visible field labels, field-linked errors and numeric limits. Tag buttons meet the 48px target and name the tag they remove.
- User detail validation places specific messages with each invalid field. The phone-only step reports its error beside the phone field; the Google email is visibly read-only.
- Toasts use polite or assertive live regions according to their kind.
- Avatars use `Intl.Segmenter` for initials in Latin and non-Latin scripts and expose the person's name.
- A 360px browser emulation check found no horizontal overflow on the app shell or design page.
- Owner cards, action buttons and forms use wrapping/minmax layouts so they fit the 360px mobile baseline without fixed content widths. A fresh rendered check remains in the Step 3 manual try-out because no browser surface was available in the build session.
- The astrologer panel, tag editor, actions and 360px preview use wrapping/flexible layouts with no fixed text height. The Step 4 manual try-out includes the rendered 360px check.
- Home uses one card column by default, two from 42rem and three from 64rem. Card contents and call-option summaries wrap without fixed text heights.
- User sign-in, details and Settings use the existing mobile-first card/input system. Google’s rendered button is capped to the available width, and Settings uses one flexible column at the 360px baseline.
- `prefers-reduced-motion: reduce` changes all animations and transitions to one 1ms iteration.
