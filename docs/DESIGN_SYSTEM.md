# Design system

The UI as built: tokens, components, animations, screens and wording. In code, the source of truth is `frontend/src/design.css`, created in Step 1. The spec is README §10.

Last updated: 2026-10-03

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
| AppBrand / AppBar | `frontend/src/components/AppBrand.tsx` | Centred AM monogram at 40px, name, optional panel label/action, and the complete logo in larger login/offline treatments | User app shell, panels, login, offline, not-found and call-room states |
| PageHeader | `frontend/src/components/PageHeader.tsx` | One title, optional intro and optional actions | Home, History, Blogs, Settings and policy pages |
| Button | `frontend/src/components/Button.tsx` | Primary, secondary, text, disabled, optional soft glow | User screens, design page and both panels |
| Card | `frontend/src/components/Card.tsx` | Default, compact, interactive hover | User screens, panels, placeholders and design page |
| Avatar | `frontend/src/components/Avatar.tsx` | 32, 40, 56 and 96px; circular astrologer photo with load-error fallback; otherwise stable id-hashed initials that skip words not starting with a letter | Settings, astrologer cards, bookings, calls, blog authors, owner list/profile and design page |
| AstrologerCard | `frontend/src/components/AstrologerCard.tsx` | 56px avatar, name, optional non-empty expertise/language rows, experience, and a full-width Call action pinned to the same bottom row even when details are absent | Home, astrologer preview and design page |
| BottomSheet | `frontend/src/components/BottomSheet.tsx` | Body portal, labelled modal, backdrop, close button, Escape key | Home call-type picker and design page |
| Dialog | `frontend/src/components/Dialog.tsx` | Body portal, labelled modal, backdrop, close button, Escape key | Owner forms, astrologer preview, blog sign-in/delete confirmations and design page |
| Toast | `frontend/src/components/Toast.tsx` | Body portal; success or error; live region; closes after four seconds | Panel action feedback; design page |
| Skeleton | `frontend/src/components/Skeleton.tsx` | Text, title and avatar | Home cards, panel authentication/data loading and design page |
| StatusBadge | `frontend/src/components/StatusBadge.tsx` | Upcoming, Completed, Missed, Phone call | Booking cards and design page |
| BookingLists | `frontend/src/components/BookingLists.tsx` | User/astrologer views, Upcoming/Past sections, live Normal Join states, phone-call notice/Settings link, astrologer `tel:` number and participant details | History and astrologer Bookings |
| BookingListSkeleton | `frontend/src/components/BookingListSkeleton.tsx` | Card-shaped title, avatar and fact placeholders | History, astrologer Bookings and call-room loading |
| GoogleSignInButton / UserSignIn | `frontend/src/components/GoogleSignInButton.tsx`, `UserSignIn.tsx` | GIS standard “Continue with Google” button in redirect mode plus a calm sign-in card | Home booking flow, History and Settings |
| PhoneNumberField | `frontend/src/components/PhoneNumberField.tsx` | Fixed `+91` prefix, 10-digit local input, linked hint/error and canonical value output | First booking, phone-only booking step and Settings |
| UserDetailsForm | `frontend/src/components/UserDetailsForm.tsx` | Name, date, local time with 12-hour reading, place, optional fixed-prefix phone, gender, client/server field errors and privacy line | First booking and Settings |
| AvailabilityEditor | `frontend/src/components/AvailabilityEditor.tsx` | Seven day/day-off groups, repeatable time ranges, responsive date exceptions, field errors, first-error focus and save warning | Astrologer Availability |
| Inputs, selects and tags | `frontend/src/design.css` | Label, hint, linked error, input, read-only input, rupee input, select, tag editor and removable tags | User forms, panel forms and design page |
| Chips | `frontend/src/design.css` | Default, selected, horizontal date/time and disabled-empty states | Panel navigation, Home slot picker and design page |
| Main navigation | `frontend/src/App.tsx` | Fixed bottom tabs below 1024px; horizontal app-bar links from 1024px; gold active tab on mobile/tablet | User app shell and design preview |
| Call-room controls | `frontend/src/screens/CallRoomPage.tsx`, `frontend/src/design.css` | Large labelled Mute/Unmute, Chat and Leave controls; capability-gated Speaker; track-backed mute state across rejoins; current remote-muted badge; two-person layout; timer/notice and full-width end action | User and astrologer call rooms |
| Call chat | `frontend/src/screens/CallRoomPage.tsx`, `frontend/src/design.css` | Portalled BottomSheet, 500-character textarea/counter, once-per-second send state, local/remote message bubbles and polite additions | Connected user and astrologer call rooms |
| Blog cards and comments | `frontend/src/screens/BlogsPage.tsx`, `BlogPostPage.tsx`, `frontend/src/components/BlogDocument.tsx`, `frontend/src/design.css` | Cover thumbnails, excerpts, reading time, author photos, rich React-rendered reading body, 32px commenter avatars, counts, route-scoped session comment drafts, 500-character comments and responsive one/two-column list | Public Blogs and post pages |
| RichBlogEditor / AstrologerBlogs | `frontend/src/components/RichBlogEditor.tsx`, `AstrologerBlogs.tsx` | Borderless title, labelled TipTap selection toolbar, keyboard formatting, cursor-line image upload/progress, editable inline captions, styled cover picker, saved/not-saved autosave status, draft/publish/unpublish/delete controls and compact post status/counts | Astrologer Blogs |
| ProfilePhotoCropper | `frontend/src/components/ProfilePhotoCropper.tsx` | Square preview, zoom and horizontal/vertical position controls before a 512px WebP upload | Astrologer Profile |
| OwnerRecentComments | `frontend/src/components/OwnerRecentComments.tsx` | Newest comments, post context and delete confirmation | Owner Recent comments |
| InstallPrompt | `frontend/src/components/InstallPrompt.tsx` | Compact Android/desktop install banner, persistent dismissal and one-time iPhone/iPad Safari Add to Home Screen guidance | Home app shell |
| PolicyLinks | `frontend/src/components/PolicyLinks.tsx` | Seven policy/help links in stacked or compact wrapping layouts | Settings and Home footer |

## Layout

- User lists and grids use one centred 60rem (about 960px) app column. Settings, policy and blog-reading content use a centred 42.5rem (about 680px) reading column.
- Home is one column by default, two from 42rem and three from 64rem. Cards in a row keep equal heights and their Call actions stay aligned.
- The owner and astrologer panels use the same 60rem width, logo app bar, wrapping section tabs and shared controls as the user app.
- On phones and tablets, the fixed tab bar is paired with shell bottom padding. From 64rem (1024px), navigation moves into the app bar and that bottom padding is removed.
- The Home footer uses the remaining page height, so it sits at the page end on short screens and follows content naturally on long screens.
- Status badges use their content width. The read-only Settings email uses the neutral page background with a dashed border. Displayed 12-hour times use lowercase `am` and `pm`.
- Rich blog reading stays inside the 42.5rem column. Its body uses 1.125rem text with 1.7 line height; images and captions fill that column without causing horizontal scroll.
- The rich-editor toolbar stays inside the editor and viewport, can scroll horizontally on a phone, and keeps 48px targets. The image button follows the selected empty line after content, image and layout changes. Profile-photo previews use the 96px circular avatar; the token-themed adjustable square cropper produces the file uploaded for server processing.

### Responsive review: pending fix 16

| Width | Before | After, checked 2026-10-03 |
|---|---|---|
| 360px | Repeated screen-specific headings, inconsistent panel branding and widths, and no single page-header rule | All 18 routed/offline states rendered with the shared brand/header treatment, fixed bottom navigation, no horizontal overflow and no visible control below 48×48px |
| 768px | User content stayed in a narrow 44rem column while panel widths differed; footer position depended only on a margin | List/grid content uses the centred 60rem cap, reading/forms use 42.5rem, the Home footer reaches the page end, and tablet bottom navigation clears all content |
| 1280px | The mobile bottom tabs remained fixed and owner/astrologer pages used unrelated 72rem/48rem widths | Navigation is in the top app bar, the bottom bar is absent, and user/panel content shares the 60rem layout with 42.5rem reading columns |

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
| `breathe` | 8s loop | Waiting room and design example | Runs once for 1ms |
| `speak-ring` | 1.2s loop | Live speaking avatars and design example | Runs once for 1ms |
| Icon cross-fade | 150ms | Call control | Transition reduced to 1ms |
| `message-in` | 180ms | Live chat messages and design example | Reduced to 1ms once |
| `heart-pop` | 300ms | Blog like toggle and design example | Reduced to 1ms once |
| Toast in / out | 220ms / 180ms | Toast component | Reduced to 1ms once |
| `check-draw` | 450ms after 300ms scale-in | Booking success and design example | Reduced to 1ms once |
| `soft-glow` | 2.4s loop | Live Join now example | Runs once for 1ms |

## Screens

| Screen | Route | States (loading, empty, error, …) | Built in step |
|---|---|---|---|
| Home | `/` | Public skeleton/error/empty/list states; install guidance; call type; session check; Google sign-in; missing details; phone-only step; slot loading/error, 14 date chips and time chips; booking summary; free confirmation or on-demand Razorpay Checkout; dismissal/failure/refund; booking success; compact policy footer | 5–8, 12, 13, 15 |
| History | `/history` | Booking skeleton/error, signed-out Google screen, Upcoming/Past Normal and phone cards, empty sections, live Join states and phone-call/number guidance | 6, 9, 12 |
| Blogs | `/blogs` | Public skeleton/error/empty/list states, cover/excerpt/author/date/read-time/count cards, 20-post pages and Load more | 14, pending fix 15 |
| Blog post | `/blogs/:id` | Public loading/not-found/rich-document states, cover, author photo/date/read time, viewer-aware like, Google gate, oldest-first comments, route-scoped session draft restoration and confirmed commenter deletion | 14, pending fix 15 |
| Settings | `/settings` | Session loading/error, signed-out Google screen, profile avatar, read-only email, editable details, upcoming-phone-call removal error, all seven policy links, save toast and logout | 6, 12, 15 |
| Call room | `/call/:bookingId` | Protected loading/error/sign-in, before-start, waiting-for-astrologer, connected and ended states; microphone denial/retry; countdown/notice; mute, conditional Speaker, transient chat, device-change feedback, speaking rings, leave and rejoin | 9–11 |
| Policy pages | `/terms`, `/privacy`, `/refunds`, `/shipping`, `/contact`, `/about`, `/pricing` | Dated public policy copy with explicit remaining owner-fact placeholders; Pricing loading/error/live Settings states | 15 |
| Offline | Current route while disconnected | Large Astromaitreyi logo/name and exact offline status message; current route returns when online | 15, pending fix 11 |
| Astrologer panel | `/astrologer` | Session check, login, forced password change, own profile-photo preview/save/change/remove, availability, bookings, and rich draft/published blog authoring and moderation | 4, 7, 9, 12, 14; pending fixes 14–15 |
| Astrologer call | `/astrologer/call/:bookingId` | The same four call states and complete controls, with caller-first-name waiting text and astrologer session protection | 9–11 |
| Owner panel | `/owner` | Session check, login, loading, empty, error, astrologer photos/removal and account management, pricing/settings and Recent comments moderation | 3, 14; pending fix 14 |
| Design system | `/_design` | Development only; absent from production code | 1 |
| Not found | Any unmatched path | Link back to Home | 1 |

## Wording

Messages shown in the UI, so the same situation always uses the same words.

| Situation | Text | Where |
|---|---|---|
| Unknown route | “This page does not exist.” | Not-found screen |
| Offline | “You're offline. Please check your internet connection.” | Global offline screen |
| Install banner | “Install Astromaitreyi” with **Install app** and **Not now** | Home in supported Android/desktop browsers |
| iOS installation | “To install: tap Share, then Add to Home Screen.” | Home in iPhone/iPad Safari |
| Shipping | “Astromaitreyi provides digital consultation services. Nothing is shipped and there are no delivery charges.” | Shipping policy |
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
| Subscription pack option | “₹999 for 4 calls · 15 min each” or “1 call left · 15 min each” / “N calls left · 15 min each” | Home call-type sheet; values come from Settings and the signed-in user |
| Credit booking action | “Confirm booking” with “1 subscription credit” in the summary | Home booking summary when a credit is available |
| New pack booking summary | “₹999 for 4 calls (this booking uses 1)” | Home booking summary with no credit; price and pack size come from Settings |
| Subscription balance | “Subscription calls left: 1 call left” or “Subscription calls left: N calls left” | Subscription success and History when relevant |
| Astrologer bookings context | “Your upcoming and past calls.” | Astrologer Bookings |
| Checkout closed | “Payment was not completed. You can try again.” | Home booking summary error |
| Checkout failed | “Payment didn't go through. If any money was deducted, it will be returned automatically.” | Home booking summary error |
| Late payment refund | “This time was booked by someone else, so we've refunded your payment.” | Home booking summary error |
| Same-slot conflict | “Sorry, this time was just booked. Please pick another time.” | Home booking summary error |
| Normal booking limit | “You already have an upcoming Normal call. You can book another after it ends.” with **Go to History** | Home booking summary notice |
| Normal booking success | “Your call is booked for {date} at {time}. You can join from History.” | Home booking success |
| Phone booking success | “Booked! {astrologer} will call you on {number} at {time} on {date}. Please keep your phone nearby.” | Home booking success |
| Phone History action | “{astrologer} will call you at {time} on {number}. Please keep your phone nearby.” with “Wrong number? Update it in Settings.” | Upcoming phone booking card |
| Phone removal blocked | “You have an upcoming phone call, so we need your number.” | Settings phone field |
| Availability scope | “Changes affect future free times only. Existing bookings stay booked.” | Astrologer Availability |
| Availability validation summary | “Please fix the highlighted hours above.” | Astrologer Availability save action |
| Empty birth date | “Enter your date of birth.” | First booking details and Settings |
| Settings save | “Saved” | Settings toast |
| Empty booking section | “No upcoming calls.” / “No past calls yet.” | History and astrologer Bookings |
| Call before start | “Please wait. Your call will start at {time}.” | User and astrologer call rooms |
| Waiting for astrologer | “Waiting for {astrologer name} to join…” | User call room |
| Waiting for user | “Waiting for {user first name} to join…” | Astrologer call room |
| Connected call | “Connected.” | Both call rooms |
| Call countdown | “Time left” with `M:SS` | Connected call rooms |
| Call ending notice | “2 minutes left.” | Connected call rooms at two minutes or less |
| Empty call chat | “No messages yet.” | Call chat sheet |
| Changed microphone | “Audio device changed.” | Call-room success toast after device replacement |
| Changed output | “Audio output changed.” | Call-room success toast after Speaker switches output |
| Ended user call | “This call has ended.” with **Back to History** | User call room |
| Ended astrologer call | “This call has ended.” with **Back to Bookings** | Astrologer call room |
| Microphone blocked | “Microphone access is blocked. In your browser's site settings, allow the microphone for this site, then try again.” with **Try again** | Both call rooms |
| Audio connection failed | “Audio could not connect. Leave the call and try joining again.” only after peer failure or a 15-second connection timeout; removed when connected | Both call rooms |

## Accessibility

- The README §10 colour tokens are used without changing their contrast pairings. Golden is used only as a background.
- All focusable elements receive the specified 3px `--color-link` focus ring.
- Current interactive targets have a minimum rendered size of 48×48px.
- Body type starts at `1rem`, uses a 1.6 line height, and text containers do not use fixed heights.
- Bottom sheets and dialogs have names, modal semantics, close buttons, backdrop dismissal and Escape handling. Initially closed overlays are hidden without animation; after opening, their normal close animation runs and they become inert.
- Dialog and BottomSheet focus the close control once when they open. Re-rendering controlled form fields does not steal focus; their Escape listeners call the latest close callback.
- Dialog, BottomSheet and Toast use React portals into `document.body`, so a transformed screen animation cannot confine their fixed positioning to the page column.
- Owner settings validation places a specific error beside every invalid field and links it with `aria-describedby` and `aria-invalid`.
- The Settings phone-removal rule is returned as a server field error and is linked to the fixed-prefix phone input with `aria-describedby` and `aria-invalid`.
- Astrologer password and profile validation use visible field labels, field-linked errors and numeric limits. Tag buttons meet the 48px target and name the tag they remove.
- User detail validation places specific messages with each invalid field. Phone controls have a visible fixed `+91` prefix and linked hints/errors; the phone-only step reports its error beside the field, and the Google email is visibly read-only.
- Availability time/date controls have visible labels and field-linked errors. An invalid save scrolls to and focuses the first invalid control and repeats the required action beside Save. The Day off label provides the checkbox's 48px target, and repeatable ranges remain a single flexible column at the mobile baseline.
- Toasts use polite or assertive live regions according to their kind.
- Avatars use `Intl.Segmenter` for initials in Latin and non-Latin scripts and expose the person's name.
- A rendered 360px Chrome check using the production CSS found the slot picker contained within the page, time chips wrapping into three columns and only the date-chip strip scrolling horizontally. The same layout expands without clipping at 1280px.
- Owner cards, action buttons and forms use wrapping/minmax layouts so they fit the 360px mobile baseline without fixed content widths. A fresh rendered check remains in the Step 3 manual try-out because no browser surface was available in the build session.
- The astrologer panel, tag editor, actions and 360px preview use wrapping/flexible layouts with no fixed text height. The Step 4 manual try-out includes the rendered 360px check.
- Home uses one card column by default, two from 42rem and three from 64rem. Card contents and call-option summaries wrap without fixed text heights.
- The Home install banner and policy footer wrap at the 360px baseline. Install actions and every policy link keep the shared 48px minimum target. Pricing uses one card column by default and three from 48rem.
- The offline sentence uses `role="status"`; policy pages keep one readable text column, semantic headings and a full-size Home action. Pricing errors use an alert and a full-size retry action.
- User sign-in, details and Settings use the existing mobile-first card/input system. Google’s rendered button is capped to the available width, and Settings uses one flexible column at the 360px baseline.
- Date chips scroll horizontally without widening the BottomSheet and reveal part of the next date on phones. Time chips wrap to about three per row at 360px. Empty dates remain visible but disabled, and selection uses the golden control background rather than golden text.
- The booking summary uses a semantic description list for astrologer, call type, IST date/time, duration and price. Submission errors are announced in an alert without closing the sheet. The upcoming-Normal limit instead uses a softly highlighted polite status, removes the repeat confirmation action and offers a full-size History link. The success checkmark has an accessible name and its History action uses the same shared link-button treatment.
- History and astrologer booking cards use semantic headings and description lists, 40px labelled avatars, visible status text, and full-width 48px Join actions. The shared card is one flexible column at 360px, wraps its header, and allows every detail value to break safely.
- Join now reuses the reduced-motion-aware soft-glow animation. A scheduled clock update switches button/status state and moves the card between sections without requiring focus movement or a page refresh.
- Call-room phase text and the two-minute notice are polite live statuses. Before-start and one-person waiting states use the reduced-motion-aware breathing circle. Connected participants have named 96px avatars; a visible muted badge also exposes an accessible “{name} is muted” label. Web Audio speaking state adds the reduced-motion-aware ring without replacing the avatar name or badge.
- Mute, capability-gated Speaker, Chat and Leave are separate large controls with text below each icon. The mobile-first two-column participant grid and wrapping controls fit the 360px baseline without fixed text heights. The countdown uses tabular numerals and an explicit accessible remaining-time label.
- Call chat is a named modal BottomSheet. New bubbles animate with `message-in` and are announced as additions in a polite live region. The textarea has a visible label, 500-character counter and full-size Send action; Send is disabled while the local one-second allowance is active or the peer is absent.
- Date exceptions stay in the existing one-column phone layout and use overlap-safe responsive grid columns at desktop widths.
- `prefers-reduced-motion: reduce` changes all animations and transitions to one 1ms iteration.
