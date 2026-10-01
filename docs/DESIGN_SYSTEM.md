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
| Avatar | `frontend/src/components/Avatar.tsx` | 32, 40, 56 and 96px; stable id-hashed colour; initials skip words that do not start with a letter | Settings, astrologer cards, owner list/profile and design page |
| AstrologerCard | `frontend/src/components/AstrologerCard.tsx` | 56px avatar, name, non-empty expertise/language rows, experience, full-width Call action and desktop hover | Home, astrologer preview and design page |
| BottomSheet | `frontend/src/components/BottomSheet.tsx` | Body portal, labelled modal, backdrop, close button, Escape key | Home call-type picker and design page |
| Dialog | `frontend/src/components/Dialog.tsx` | Body portal, labelled modal, backdrop, close button, Escape key | Owner forms, astrologer preview and design page |
| Toast | `frontend/src/components/Toast.tsx` | Body portal; success or error; live region; closes after four seconds | Panel action feedback; design page |
| Skeleton | `frontend/src/components/Skeleton.tsx` | Text, title and avatar | Home cards, panel authentication/data loading and design page |
| StatusBadge | `frontend/src/components/StatusBadge.tsx` | Upcoming, Completed, Missed, Phone call | Booking cards and design page |
| BookingLists | `frontend/src/components/BookingLists.tsx` | User/astrologer views, Upcoming/Past sections, live Join states and participant details | History and astrologer Bookings |
| BookingListSkeleton | `frontend/src/components/BookingListSkeleton.tsx` | Card-shaped title, avatar and fact placeholders | History, astrologer Bookings and call placeholders |
| GoogleSignInButton / UserSignIn | `frontend/src/components/GoogleSignInButton.tsx`, `UserSignIn.tsx` | GIS standard “Continue with Google” button in redirect mode plus a calm sign-in card | Home booking flow, History and Settings |
| PhoneNumberField | `frontend/src/components/PhoneNumberField.tsx` | Fixed `+91` prefix, 10-digit local input, linked hint/error and canonical value output | First booking, phone-only booking step and Settings |
| UserDetailsForm | `frontend/src/components/UserDetailsForm.tsx` | Name, date, local time with 12-hour reading, place, optional fixed-prefix phone, gender, field errors and privacy line | First booking and Settings |
| AvailabilityEditor | `frontend/src/components/AvailabilityEditor.tsx` | Seven day/day-off groups, repeatable time ranges, responsive date exceptions, field errors, first-error focus and save warning | Astrologer Availability |
| Inputs, selects and tags | `frontend/src/design.css` | Label, hint, linked error, input, read-only input, rupee input, select, tag editor and removable tags | User forms, panel forms and design page |
| Chips | `frontend/src/design.css` | Default, selected, horizontal date/time and disabled-empty states | Panel navigation, Home slot picker and design page |
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
| `check-draw` | 450ms after 300ms scale-in | Booking success and design example | Reduced to 1ms once |
| `soft-glow` | 2.4s loop | Live Join now example | Runs once for 1ms |

## Screens

| Screen | Route | States (loading, empty, error, …) | Built in step |
|---|---|---|---|
| Home | `/` | Public skeleton/error/empty/list states; call type; session check; Google sign-in; missing details; phone-only step; slot loading/error, 14 date chips and time chips; booking summary/error/submitting/success states | 5–8 |
| History | `/history` | Booking skeleton/error, signed-out Google screen, Upcoming/Past Normal cards, empty sections and live Join states | 6, 9 |
| Blogs | `/blogs` | Placeholder | 1 |
| Blog post | `/blogs/:id` | Later-step placeholder | 1 |
| Settings | `/settings` | Session loading/error, signed-out Google screen, profile avatar, read-only email, editable details, policy links, save toast and logout | 6 |
| Call room | `/call/:bookingId` | Protected loading/error/sign-in states, before-start waiting time and after-start Step 10 placeholder | 9 |
| Policy pages | `/terms`, `/privacy`, `/refunds`, `/shipping`, `/contact`, `/about`, `/pricing` | Later-step placeholder | 1 |
| Astrologer panel | `/astrologer` | Session check, login, forced password change, profile and availability workflows, private Upcoming/Past bookings; Blogs placeholder | 4, 7, 9 |
| Astrologer call | `/astrologer/call/:bookingId` | Protected login/loading/error states, before-start waiting time and after-start Step 10 placeholder | 9 |
| Owner panel | `/owner` | Session check, login, loading, empty, error, astrologer management and pricing/settings | 3 |
| Design system | `/_design` | Development only; absent from production code | 1 |
| Not found | Any unmatched path | Link back to Home | 1 |

## Wording

Messages shown in the UI, so the same situation always uses the same words.

| Situation | Text | Where |
|---|---|---|
| Later feature route or panel section | “Coming in a later step.” | Blog post, policies and astrologer Blogs |
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
| Empty slot date | “No free times on this day. Please try another day.” | Home slot picker |
| Free booking action | “Confirm booking” | Home booking summary |
| Paid booking deferral | “Paid bookings come in a later step.” | Home booking summary error |
| Same-slot conflict | “Sorry, this time was just booked. Please pick another time.” | Home booking summary error |
| Normal booking limit | “You already have an upcoming Normal call. You can book another after it ends.” with **Go to History** | Home booking summary notice |
| Normal booking success | “Your call is booked for {date} at {time}. You can join from History.” | Home booking success |
| Availability scope | “Changes affect future free times only. Existing bookings stay booked.” | Astrologer Availability |
| Availability validation summary | “Please fix the highlighted hours above.” | Astrologer Availability save action |
| Empty birth date | “Enter your date of birth.” | First booking details and Settings |
| Settings save | “Saved” | Settings toast |
| Empty booking section | “No upcoming calls.” / “No past calls yet.” | History and astrologer Bookings |
| Call before start | “Please wait. Your call will start at {time}.” | User and astrologer call placeholders |
| Call from start | “Coming in the next step” | User and astrologer call placeholders |

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
- User detail validation places specific messages with each invalid field. Phone controls have a visible fixed `+91` prefix and linked hints/errors; the phone-only step reports its error beside the field, and the Google email is visibly read-only.
- Availability time/date controls have visible labels and field-linked errors. An invalid save scrolls to and focuses the first invalid control and repeats the required action beside Save. The Day off label provides the checkbox's 48px target, and repeatable ranges remain a single flexible column at the mobile baseline.
- Toasts use polite or assertive live regions according to their kind.
- Avatars use `Intl.Segmenter` for initials in Latin and non-Latin scripts and expose the person's name.
- A 360px browser emulation check found no horizontal overflow on the app shell or design page.
- Owner cards, action buttons and forms use wrapping/minmax layouts so they fit the 360px mobile baseline without fixed content widths. A fresh rendered check remains in the Step 3 manual try-out because no browser surface was available in the build session.
- The astrologer panel, tag editor, actions and 360px preview use wrapping/flexible layouts with no fixed text height. The Step 4 manual try-out includes the rendered 360px check.
- Home uses one card column by default, two from 42rem and three from 64rem. Card contents and call-option summaries wrap without fixed text heights.
- User sign-in, details and Settings use the existing mobile-first card/input system. Google’s rendered button is capped to the available width, and Settings uses one flexible column at the 360px baseline.
- Date chips scroll horizontally without widening the BottomSheet and reveal part of the next date on phones. Time chips wrap to about three per row at 360px. Empty dates remain visible but disabled, and selection uses the golden control background rather than golden text.
- The booking summary uses a semantic description list for astrologer, call type, IST date/time, duration and price. Submission errors are announced in an alert without closing the sheet. The upcoming-Normal limit instead uses a softly highlighted polite status, removes the repeat confirmation action and offers a full-size History link. The success checkmark has an accessible name and its History action uses the same shared link-button treatment.
- History and astrologer booking cards use semantic headings and description lists, 40px labelled avatars, visible status text, and full-width 48px Join actions. The shared card is one flexible column at 360px, wraps its header, and allows every detail value to break safely.
- Join now reuses the reduced-motion-aware soft-glow animation. A scheduled clock update switches button/status state and moves the card between sections without requiring focus movement or a page refresh.
- Date exceptions stay in the existing one-column phone layout and use overlap-safe responsive grid columns at desktop widths.
- `prefers-reduced-motion: reduce` changes all animations and transitions to one 1ms iteration.
