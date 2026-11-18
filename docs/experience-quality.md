# Player analysis experience

The player workspace keeps its existing layout and uses `experience-quality.css` for shared control sizing, responsive behavior and focus states.

- Navigation writes a `snapshot=1` query flag so a shared URL restores the full selection, including default values. Direct visits without filter parameters can inherit the last analysis from session storage. Explicit URL selections take precedence. Custom lines travel with a selected market when opening another player.
- `InteractiveHistoryChart` uses the same analytics values as the summary. Equality is neutral. Missing and unplayed records do not become zeroes. It supports touch and keyboard navigation and links each selected game to its result. Confirmed team scores come from the supplied calendar history.
- `contextSamples` applies opponent and minutes filters before taking each venue sample. Venue rows use up to the selected number of games per venue. Period rows intentionally include both venues and say so in the interface.
- `PlayerNextGame` shares cached public reads, pauses polling in hidden tabs and exposes market reads only when their panel is open. Opt-in notices run inside the visible player page. They compare observed availability and line changes and have a per-player frequency limit. They do not send browser push, email or SMS. Market data still requires server-side `ODDS_API_KEY`.
- `PlayerNotes` loads on expansion and stores up to 2,000 characters in the existing database, scoped by the authenticated account and player. All responses are private/no-store. Mutations enforce same-origin JSON through `accountJson`. Saving an empty note removes its stored row.
- Named analysis views (up to ten) are browser-local links preserving the URL selection. They contain no account credentials or private notes.
- Followed players are grouped by their next published game date in Argentina. Notes remain available through the player profile.
- The share dialog downloads the same rendered canvas shown in the preview, at the chosen original pixel dimensions. Failed photos or logos show a retry control.

Verification: typecheck, baseline lint, unit suite, production deployment build and browser checks of the player page, filters, chart and export dialog. Private note persistence requires a signed-in session for end-to-end verification.
