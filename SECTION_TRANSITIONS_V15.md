# Aurevia v15 — Two-second BTC section transitions

After the startup loader finishes, Aurevia now uses a two-second section transition whenever a dashboard section/page is opened.

- A transparent, gold Bitcoin coin rotates in the center.
- The coin has a layered 3D rim, glow, orbital ring and perspective grid.
- The transition runs for at least 2 seconds before the next dashboard section is revealed.
- Page content can load underneath the transition so slow server requests do not create a second visual wait.
- Navigation clicks wait 2 seconds before moving to the next dashboard page, then the destination avoids a duplicate transition.
- Direct page loads show the two-second transition automatically.
- Admin, Terms and Privacy pages also use the same transition visual.
- Reduced-motion users still receive the two-second transition; only the visual animation can be reduced by the browser/user CSS settings later if desired.
