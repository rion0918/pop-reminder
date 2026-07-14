# Home Next Reminder Bubble Card — Design QA

- source visual truth: `/var/folders/9r/6rt2kgpj4cq4j9r3014h6bmh0000gn/T/TemporaryItems/NSIRD_screencaptureui_Vwuouf/スクリーンショット 2026-07-14 19.01.06.png`
- implementation screenshot: `/private/tmp/pop-next-card-android.png`
- interaction screenshot: `/private/tmp/pop-next-card-detail.png`
- focused comparison: `/private/tmp/pop-next-card-comparison.png`
- viewport: Android A002SH, 360 × 740dp (1080 × 2340px, 480dpi)
- state: active reminders present; next reminder is `こんにちは`, today at 20:00

## Findings

- No actionable P0, P1, or P2 differences were found.
- Fonts and typography: the purple kicker, heavy reminder title, and right-aligned date/time preserve the detail card hierarchy at a compact scale. Text remains legible at 360dp.
- Spacing and layout rhythm: the 68dp card, 24dp radius, 40dp icon surface, and 14dp horizontal padding keep the card compact without crowding the Bubble Board.
- Colors and visual tokens: the lavender border, purple accent, white icon surface, and ink title match the detail card treatment.
- Image quality and asset fidelity: the existing `reminder-detail-bubbles.png` is reused directly. The wide cover crop remains sharp and keeps the large right bubble visible without obscuring text.
- Copy and content: `次のリマインド`, the actual title, and the existing formatted date/time are shown. The empty fallback copy is not duplicated in this card.
- Interaction: tapping the card opened the detail sheet for `こんにちは` at 20:00. AndroidRuntime and ReactNativeJS error logs were empty after the interaction.

## Comparison History

- Initial pass: no P0/P1/P2 issues. No visual correction pass was required.

## Residual Test Gap

- The iOS Development Build compiled and the zero-reminder hidden-card state was verified on an iPhone 17 Pro Max Simulator. Its separate empty database did not provide an active-reminder card to capture; the active state was verified on Android using the shared React Native implementation.

## Implementation Checklist

- [x] Reuse the detail bubble asset
- [x] Keep title truncation independent from the date/time
- [x] Open the matching reminder detail on tap
- [x] Hide the card when no active reminder exists
- [x] Verify Android active and iOS empty states

final result: passed
