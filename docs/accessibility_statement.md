# HimVote Accessibility Statement and WCAG 2.2 AA Compliance Breakdown

## 1. Institutional Commitment to Universal Access

The HimVote platform is designed from the ground up to ensure every eligible student and institutional member can exercise their democratic right to vote independently, privately, and securely. Equal access is a fundamental institutional requirement, not an optional enhancement.

HimVote commits to compliance with the Web Content Accessibility Guidelines (WCAG) 2.2 Level AA across all supported user interfaces: Web (Next.js), Android (Jetpack Compose), iOS (SwiftUI), and Windows desktop (WinUI 3).

___

## 2. WCAG 2.2 Level AA Compliance Breakdown

The implementation adheres to the four core principles of accessibility: Perceivable, Operable, Understandable, and Robust.

### Principle 1: Perceivable

```text
Perceivable Criteria Implementation:

1. Text Alternatives (WCAG 1.1.1 Non text Content)
   * All graphical buttons, institutional crests, and status badges provide descriptive alternative text.
   * Decorative icons are explicitly hidden from accessibility trees using aria hidden attributes or Compose clearAndSetSemantics.

2. Adaptable Layout and Content Structure (WCAG 1.3.1, 1.3.2, 1.3.5)
   * Semantic HTML5 elements (main, header, nav, section, article) define page structure on Web.
   * Native accessibility nodes with correct role traits (Heading, Button, RadioButton, LiveRegion) define structure on Android, iOS, and Windows.
   * Reading and navigation sequence follows natural reading order across all screen sizes.

3. Contrast and Distinguishability (WCAG 1.4.3, 1.4.11, 1.4.12)
   * Text Contrast: Normal text maintains a minimum contrast ratio of 4.5 to 1 against background elements. Large text maintains at least 3 to 1.
   * Non Text Contrast: UI component boundaries, active radio buttons, and focus indicators maintain at least 3 to 1 contrast against adjacent surfaces.
   * Color Independence: Color is never used as the sole indicator of state. Status changes (such as PENDING_WITNESS vs WITNESSED) include distinct textual labels and distinct geometric iconography.
   * Text Resizing: All views support text enlargement up to 200 percent without truncation, clipping, or horizontal scrolling.
```

### Principle 2: Operable

```text
Operable Criteria Implementation:

1. Keyboard and Hardware Navigation (WCAG 2.1.1 Keyboard, 2.1.2 No Keyboard Trap)
   * Every interactive control in the ballot casting flow can be discovered, activated, and dismissed using keyboard only navigation on Web and Windows, or external switch controllers on mobile.
   * Zero keyboard traps exist. Modals and confirmation dialogs allow clean dismissal via the Escape key.

2. Focus Visibility and Appearance (WCAG 2.4.7 Focus Visible, 2.4.11 Focus Appearance)
   * Active focus is indicated by a persistent, high visibility indicator (minimum 2 pixel solid outline with contrasting offset).
   * Focus indicators remain visible during scrolling and view transitions.

3. Target Size and Pointer Cancellation (WCAG 2.5.3, 2.5.8 Target Size Minimum)
   * Touch targets on mobile clients and interactive controls on desktop clients maintain a minimum touch area of 44 by 44 CSS pixels on Web and 48 by 48 density independent pixels on mobile devices.
   * Pointer down actions can be cancelled by moving away from the control prior to pointer release.
```

### Principle 3: Understandable

```text
Understandable Criteria Implementation:

1. Language and Clarity (WCAG 3.1.1 Language of Page)
   * Primary page language is explicitly declared in document metadata (lang attribute set to en).
   * Instructions use clear, plain language avoiding technical jargon. Cryptographic terminology is presented with plain language explanations.

2. Predictable Behavior (WCAG 3.2.1 On Focus, 3.2.2 On Input)
   * Focusing on an input element or selecting a candidate never triggers an unexpected context change, form submission, or navigation leap.

3. Error Identification and Recovery (WCAG 3.3.1, 3.3.3, 3.3.4, 3.3.7)
   * When an error occurs (e.g. attempting to select more candidates than permitted by contest rules), a clear textual summary is displayed above the contest with direct keyboard focus.
   * Review Screen: The voting workflow enforces a mandatory pre submission review screen detailing all selected candidates, allowing the voter to verify choices before final cryptographic commitment.
```

### Principle 4: Robust

```text
Robust Criteria Implementation:

1. Screen Reader Compatibility (WCAG 4.1.2 Name, Role, Value)
   * Form controls and candidate radio cards expose programmatic names, roles, and checked states.
   * Assistive technologies accurately identify when a candidate card is selected, unselected, or disabled.

2. Dynamic Status Announcements (WCAG 4.1.3 Status Messages)
   * Asynchronous ballot submission states utilize ARIA live regions:
       * Submission start announces: Ballot submitted, awaiting witness confirmation.
       * Progression to WITNESSED announces: Ballot witnessed by independent observers.
       * Progression to ANCHOR_FINALIZED announces: Ballot permanently anchored on ledger.
   * Live regions use aria live polite for normal progress updates and aria live assertive for connectivity warnings or submission errors.
```

___

## 3. Dedicated Evaluation of the Voting Engine Booth

Wrapper level compliance is insufficient to guarantee voting privacy for disabled voters. The embedded voting booth within `apps/web/src/components/booth` was subjected to standalone accessibility evaluation:

* **Contest Stepper Navigation**: Contest cards can be traversed using standard Tab, Shift Tab, and Arrow keys.
* **Selection State Annunciation**: Screen readers announce: Candidate Alice Smith, Contest President, checked, 1 of 4.
* **Confirmation Dialogue**: The final review modal traps focus within the review boundary until either Confirm and Cast or Return to Edit is triggered.
* **Timing Independence**: No countdown timers force submission during ballot selection. If a university election imposes a global closing time, voters are notified with auditory and visual alerts at 15 minutes, 5 minutes, and 1 minute prior to close.

___

## 4. Assistive Technology Compatibility Matrix

```text
Tested Assistive Technology Configurations:

* Windows Desktop: NVDA 2024.x with Chrome, Edge, and WinUI 3 desktop client.
* Windows Desktop: Windows Narrator with Edge and WinUI 3 desktop client.
* macOS: VoiceOver with Safari and Chrome.
* iOS: VoiceOver with iOS client application.
* Android: TalkBack with Android client application.
* Physical Navigation: External Bluetooth switch access controllers and USB numeric keypads.
```

___

## 5. Accessibility Support and Dispute Process

Voters encountering any accessibility barrier during an election may contact the Institutional Accessibility Officer immediately via:
* Internal Portal: Accessibility Assistance desk located on the election dashboard.
* Real Time Support: Live operator assistance channel operating throughout the election window. Support personnel are bound by strict operational rules prohibiting them from asking for or viewing voter credentials or ballot choices.
