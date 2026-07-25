# Design QA

- Reference: `reference-entrance.png` (1956 × 1774)
- Implementation: `implementation-entrance-qa.png` (1085 × 986)
- Comparison: `design-qa-comparison-final.png`
- Motion comparison: `design-qa-motion-comparison.png`
- Seam comparison: `design-qa-seam-comparison.png`
- Story reference: `reference-story-section.png`
- Story implementation: `implementation-story-desktop.png`
- Story comparison: `story-design-comparison.png`
- Figma source truth: `figma-story-reference.png` (1440 × 1085)
- Figma implementation: `implementation-figma-story.png` (1440 × 1085)
- Figma comparison: `figma-story-comparison.png` (2880 × 1085)
- Tested viewport: 1100 × 1000, matching the reference aspect ratio
- Tested state: initial entrance and completed scroll transition

## Full-view comparison

The implementation preserves the reference's defining composition: a warm, front-facing
beige computer centered on white, a high-contrast black CRT bezel, generous negative
space, and a close crop that reveals the drive near the lower edge. The generated
computer is intentionally cleaner and slightly smaller than the photographed reference,
while retaining its visual weight.

## Focused-region comparison

The prompt is centered inside the active screen, per the requested change. Its compact
uppercase setting remains readable without competing with the computer. The screen
hit area is keyboard focusable and spans the screen region.

## Interaction and responsive checks

- The hero remains pinned for 150vh of scrub distance inside a 250vh sequence.
- The Mac scales from 1 to 8 with an accelerated exponential mapping.
- At 60% progress, the prompt begins fading and the warm beige challenge layer
  (`rgb(233, 224, 207)`) crossfades beneath the screen.
- At 100% progress, the hero is fully transparent and the sticky stage unpins into
  normal beige challenge content.
- Scrolling upward reverses scale, text opacity, and section opacity smoothly.
- Reduced-motion preferences hold the Mac at scale 1 and use only the crossfade.
- Wide viewports use a height-aware scale so the entire computer remains legible.
- Taller viewports retain the close, reference-like crop.
- At 390 × 844, the measured transform origin matched the responsive CRT screen
  center to within one subpixel.
- Browser console check: no errors or warnings.

## Image seam and CRT text checks

- The source asset's four 80 × 80 corner samples and four 12px edge-strip
  samples all average `rgb(254, 254, 254)` (`#FEFEFE`).
- The hero surface now uses `#FEFEFE`; the image's contrast filter was removed so
  its edge pixels are not altered after compositing.
- At 1440px, the mean pixel delta across each vertical asset boundary was 0.1 or
  less, with a maximum single-channel delta of 1.
- At 768px, the mean delta was 0.08 or less, with a maximum of 1.
- At 390px, both vertical edge comparisons measured a delta of 0.
- GSAP 3.15 core and ScrambleTextPlugin load in sequence from jsDelivr. Both CRT
  lines resolve back to their complete original text after the scramble.
- Reduced-motion users keep the original static text and skip the scramble.

## Horizontal story deck

- The story sequence begins directly after the CRT crossfade, with no interstitial
  hard cut.
- At 1440 × 900, the sticky stage remained fixed at `top: 0` for 2333px of
  scroll travel while the track translated from 0px to -2333px.
- The right-hand premise stayed vertically centered while the cards moved beneath
  it. The final card rested at x = 144px–893px, leaving the premise unobstructed.
- After the final position, the stage moved upward with the page and normal
  vertical scrolling resumed.
- Reversing the scroll moved the track from -2333px back toward 0px without a jump.
- At 390 × 844, the stage resolved to `position: relative`, the track to a vertical
  grid with `transform: none`, and each card measured 335px wide.
- The 900px breakpoint deliberately gives tablet and phone layouts the simpler
  unpinned stack.
- The reference informed the warm neutral field, editorial scale, generous
  negative space, and floating presentation surfaces. The intro remains on the
  right as requested, and Quorum's restrained sans-serif system replaces the
  reference's mixed serif treatment.
- The scroll loop reads layout only during measurement and animates only
  `transform` and `opacity`; `will-change` is limited to the active desktop mode.

## Intro regression verification

- The CRT zoom and story deck now have independent measurement and render
  controllers. A missing or changing story layout can no longer prevent the hero
  from initializing.
- The zoom sequence has an explicit stacking layer above the story sequence, so
  the later sibling cannot paint over the sticky hero before its scroll range ends.
- At 1280 × 720, the hero remained pinned at `top: 0` from scroll 0–1080px.
- At scroll 300px, the Mac measured scale 1.418 while the story track remained at
  translateX(0).
- At scroll 1080px, the Mac reached scale 8, the hero reached opacity 0, the beige
  reveal reached opacity 1, and the story intro remained at opacity 0.
- The story section reached the viewport at scroll 1800px with its track still at
  translateX(0). Only subsequent scrolling activated its horizontal movement.
- The computed transform origin matched the CRT center within 0.001px on both axes.
- Scrolling back from the story range returned the Mac to the corresponding scale
  with the sticky stage still fixed and the story track reset.
- Browser console check after the regression fix: no errors or warnings.

## Figma story-section fidelity

- Source: Figma node `2078:313`, captured at its native 1440 × 1085 size.
- Implementation: browser viewport 1440 × 1085 at device scale 1, captured at
  the story sequence's initial resting state.
- Density normalization: none required; both images are 1440 × 1085.
- Full-view comparison: the cream canvas, top composition, card rail, card reveal,
  and negative-space ratios align with the source.
- Focused-region comparison: the title label measured x = 52px, y = 49px,
  231 × 124px; the bordered copy block measured x = 789px, y = 77px,
  593 × 90px. The first slide measured x = 69px, y = 260px,
  1103 × 631px. These track the Figma geometry to rounding tolerance.
- Fonts and typography: the Figma-specified Satoshi Bold is bundled locally and
  used for the title label and explanation. Slide content retains Quorum's
  existing editorial sans-serif hierarchy.
- Spacing and layout rhythm: 70px slide inset, 24px track gap, 8px radii, and
  source-relative top offsets are preserved.
- Colors and tokens: the section and handoff use `#FFFBEA`; slide and label
  surfaces use white; copy and borders use black.
- Image quality and asset fidelity: the frame contains no raster artwork or
  icons, so no image substitution was required.
- Copy and content: the title and explanation match the Figma frame. The blank
  Figma slide placeholders intentionally contain the already-approved Quorum
  narrative content.
- Responsive evidence: at 390 × 844, the rail becomes an unpinned vertical
  stack; its card width is 335px and track transform is `none`.
- Interaction evidence: at 1280 × 720 the story track remained at translateX(0)
  on entry and moved to -500px after 500px of subsequent scroll. The CRT hero
  remained sticky and scaled independently before the story range.
- Console errors and warnings: none.
- Findings: no actionable P0, P1, or P2 differences remain. The visible browser
  scrollbar is browser chrome and excluded from the source-content comparison.
- Comparison history: the first implementation matched the slide geometry but
  placed the title and description too far apart. Their offsets were corrected
  to the measured Figma coordinates, and Satoshi Bold was bundled locally before
  the final comparison.

## Prototype screen 01 — Landing / Invite

- Product source truth: `Quorum_Codex_Build_Brief.docx`, sections 5.1 and 9.
- Visual-language source: `figma-story-reference.png`.
- Responsive verification: live browser checks at 1440 × 900, 768 × 900, and
  390 × 844 CSS viewports.
- Combined style comparison: `prototype-screen-1-style-comparison.png`.
- State: initial Vegas Weekend participant invite.
- Full-view comparison: this is a new product screen rather than a literal
  recreation of the presentation frame. The comparison verifies the shared
  cream canvas, Satoshi hierarchy, black outlined labels, restrained radii, and
  high-contrast black action treatment without claiming identical structure.
- Focused-region evidence: the mobile capture confirms that the generated
  1086 × 1448 Vegas image crops cleanly inside the 24px cover card, the trip
  metadata remains legible in three columns, and the action remains fully
  visible at the bottom of the phone frame.
- Fonts and typography: Satoshi Bold carries the product identity and display
  hierarchy; Arial is used for longer body copy for clarity.
- Spacing and layout rhythm: 18px content gutters, 10px image gutters, 24px
  cover radius, and a 52px primary action tighten the original screen by
  approximately 20 percent while preserving its hierarchy.
- Colors and tokens: `#FFFBEA` app surface, `#161511` ink/action, warm neutral
  desktop surround, and `#D5EB84` accepted state.
- Image quality and asset fidelity: the cover is a project-local generated
  editorial Vegas photograph with no placeholder, logo, watermark, or text.
- Copy and content: title, dates, origin, six-person group, inviter, privacy
  promise, and Review options action follow the build brief.
- Interaction evidence: activating Review options sets `aria-pressed=true`,
  changes the label to “Ready to review,” updates the status copy, and exposes
  the accepted state without revealing any private financial information.
- Responsive evidence: the outer document scroll height exactly matched the
  viewport at all three sizes and `window.scrollY` remained 0. The phone measured
  380 × 720 at 1440px and 768px wide, and 366 × 717.4 at 390px wide, centered
  on both axes inside a 100dvh overflow-hidden stage.
- Internal-scroll evidence: the phone body measured 616px high with 117px of
  internal overflow on desktop and 613px high with 104px of internal overflow
  on mobile. Scrolling to the end changed only the body's `scrollTop`; the
  action button stayed at the same viewport coordinates.
- Accessibility evidence: semantic heading, description list, complementary
  privacy notice, 52px button target, focus-visible treatment, live status copy,
  meaningful image alt text, and reduced-motion handling are present.
- Console errors and warnings: none.
- Interaction evidence: at 390 × 844, the primary action changed to
  “Ready to review,” `aria-pressed` changed to `true`, and the computed button
  background changed to `rgb(213, 235, 132)`.
- Findings: the prior viewport-fixed action and full-height page shell could
  create competing page scroll behavior. The phone now owns its scroll range
  and the action is pinned as the second row of the phone frame.
- Follow-up polish: wire the accepted state into screen 02 once that screen is
  designed.

## Prototype create / join entry flow

- Mobbin-informed pattern: the default entry now separates organizer creation
  from recipient joining, with one dominant Create a group action and a quiet
  join fallback.
- Progressive disclosure: group name and type appear only after Create; invite
  distribution appears only after the group exists; the richer Vegas invite is
  reserved for manual or deep-linked recipients.
- Create path: editable group name, four single-select group types, disabled
  empty-name state, group-created confirmation, copy-link feedback, direct friend
  selection, and visible member-stack updates.
- Join path: invite-link/code field, disabled empty state, contextual group
  preview before joining, and the original private response experience.
- Deep-link path: `/prototype?invite=vegas` opens directly on the contextual
  Vegas Weekend invite instead of showing the generic create/join gateway.
- Privacy hierarchy: the home screen explains the difference between group
  visibility and personal visibility once, then repeats only the shorter
  task-specific assurance at decision points.
- Motion: screen changes animate only opacity and translateY, with the existing
  reduced-motion fallback preserved.
- Viewport contract: every state remains inside the existing 380px / 85dvh phone
  frame; longer creation and invite states scroll internally rather than moving
  the document.
- Static verification: ESLint and the production Vinext build pass.
- Automated scaffold tests remain red for pre-existing starter assumptions:
  they expect a removed `_sites-preview/SkeletonPreview.tsx` file and a
  `codex-preview` metadata tag on `/`; neither failure touches `/prototype`.
- Visual-browser verification was attempted, but the in-app browser blocked the
  localhost navigation after its initial connection-refused error. No visual
  fidelity claim is made for this pass.

## Comparison history

The first static comparison showed the computer was too small. Its responsive scale
was reworked, then recaptured at the reference aspect ratio. The motion comparison
places the source, start, zoom, and crossfade states in one strip and confirms that the
screen remains the visual target throughout the transition.

## Prototype create-group spectrum picker

- Source visual truth: `/var/folders/hc/nfc4ycx96bv21bv8zbsvdc6r0000gn/T/codex-clipboard-f546a350-6693-44b9-86b6-8829d4b37699.png` (70 × 258).
- Implementation evidence: `design-qa-picker-390.png` at a 390 × 844 CSS viewport.
- Focused implementation crop: `design-qa-picker-focus.png` (58 × 152).
- Normalized side-by-side comparison: `design-qa-picker-comparison.png`.
- Tested state: create-group screen with a completed group name and the Poolside vibe selected.
- Full-view comparison: the compact picker remains right-aligned immediately above the primary action, preserving the requested location and the phone frame’s no-page-scroll contract.
- Focused-region comparison: the implementation matches the reference’s defining thin vertical rainbow spectrum, white rounded border, light circular thumb, and restrained shadow. The thumb position is stateful rather than fixed because it communicates the selected vibe.
- Typography and spacing: the inline group name retains the existing Fi-style treatment. Its input now measures 55.4px high at a 39px font size with explicit vertical padding; the rendered “Vegas Weekend” is fully visible with no clipped ascenders or descenders.
- Interaction evidence: Arrow Up advanced the slider from “Golden hour” to “Poolside,” updated `aria-valuenow` from 0 to 1, and visibly changed the card gradient. Pointer capture, upward drag scrubbing, release snapping, and the reduced-motion instant fallback remain wired to the same control.
- Flow evidence: after entering “Vegas Weekend,” Create group advanced to the Invite friends screen with the selected Poolside state intact. Returning to group details preserved the name and vibe.
- Responsive evidence: at 390 × 844, the document measured exactly 390 × 844 with no horizontal or vertical page overflow. The phone measured 366 × 717.4px; the picker measured 30 × 124px and the thumb measured 28 × 28px.
- Accessibility evidence: the picker remains a named ARIA slider with numeric bounds, current named-value text, keyboard arrow support, a visible focus ring, and a 30 × 124px interaction target.
- Console evidence: no errors were recorded during typing, keyboard selection, create-group submission, or return navigation.
- Findings: no actionable P0, P1, or P2 fidelity differences remain. The source image’s dark photographed backdrop is intentionally not reproduced because the control must inherit Quorum’s active full-bleed gradient.
- Comparison history: the former circular orb was replaced with the narrow spectrum control, then its dimensions and thumb treatment were normalized against the supplied reference. The initial browser crop returned an empty surface, so the focused evidence was recropped from the verified full-view capture before the final visual comparison.

final result: passed
