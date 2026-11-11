# Changelog

## 0.1.3

- Keep the Codex provider logo readable when its thread is selected in light mode, including while its activity ring is spinning.

## 0.1.2

- Remove desktop sidebar overhang so horizontal trackpad gestures cannot pan the thread list.
- Keep vertical scrolling and pinned headers working at narrow and wide sidebar widths, with the phone layout unchanged.
- Hold urgency ordering across the full sidebar width during pointer interaction.

## 0.1.1

- Allow installation on bb 0.49.0; remove the unnecessary bb minor-version ceiling while retaining the SDK compatibility range.
- Handle sidebar activity without the retired `goals` field, preserving goal indicators on older bb versions.
- Check both bb 0.48.1 and 0.49.0 builds and their SDK versions in CI, plus a weekly check against the latest bb and SDK.

## 0.1.0

- Full MIT-licensed bb thread-list fork, preserving upstream interactions.
- Provider activity rings, quiet new/unread signals and nested review rows.
- Seven-child rollups with remembered choice and stable ordering during interaction.
- Pinned section and parent headers on desktop and phone.
- Optional versioned Boat integration, including queued starts and same-slot chat replacement.
- Mobile width constrained to its drawer, preserving vertical touch scrolling.
