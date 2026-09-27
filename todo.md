# Smart Campus project status

## Completed in this update
- Added email-linked student and teacher profiles, class/subject teaching assignments, and attendance evidence references to the database schema.
- Scoped teacher rosters to assigned classes and attendance visibility/review to the teacher's assigned class and subject; students see only their linked profile, assigned teachers, published notes, and their own attendance.
- Connected class notes, attendance, camera evidence, profile details, and teacher review actions to Manus database/storage APIs.
- Seeded Class 3B with 7 student profiles, 2 teachers, 4 active class/subject assignments, and 3 idempotent starter notes. Direct DB verification found 7 students, 2 teachers, 4 assignments, and 4 total notes (one existing note was already present).
- Replaced the authenticated teacher dashboard's sample attendance trend with daily records from the database.
- Added/updated protected API tests for profile, roster, note, attendance, webcam, complaint, and attachment routes.

## Validation status
- `pnpm check`: passing after the latest source edits.
- `pnpm test` and `pnpm build`: passed before the final small chart/roster-scope refinements; rerun before delivery.
- Desktop and mobile preview screenshots captured; final screenshot/status refresh pending.

## Known limitations / follow-up
- Demo classroom occupancy, lights/fans, alerts, and some complaint/notification UI remain illustrative; no live ESP32 device bridge is configured.
- Webcam check-in stores image evidence and awaits teacher review; automatic OpenCV face recognition/identity matching is not implemented in this update.
- Authentication uses the project's configured Manus OAuth session. Email OTP/password-reset flow is not implemented.
