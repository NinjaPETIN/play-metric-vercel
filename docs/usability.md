# Workspace usability

- Calendar cards expose one primary navigation action and one quick-view action. The selected game, mode, date offset and search are stored together for return navigation.
- `useNavigationPosition` restores both document and main-panel scroll after data is ready. Scroll writes are batched by animation frame. Positions expire after one day and restoration stops when the user starts scrolling. Only navigation coordinates are stored.
- Catalog expansion and line-table pagination survive return navigation. URL parameters still take precedence over remembered settings.
- The filter panel is a modal drawer with focus containment, background inertness, Escape/backdrop closing and focus restoration. Filters apply immediately. The footer closes the drawer to view results.
- Favorites uses `followedAgenda` to group the current team's next games, with Argentina dates and live games first. Unknown current teams never fall back to an old confirmed affiliation. Multiple saved markets do not duplicate players.
- Public catalog changes retain layout while the previous sample is inert and visibly covered. Failed refreshes provide a retry action instead of presenting the previous sample under new filters as current.
- The main chart labels automatic, custom and selected bookmaker lines separately. A selected bookmaker label applies only while player, market, side and line still match that choice. Reopening a URL with a numeric line treats it as custom rather than asserting an unverified bookmaker origin.
- Market-line selection remains dependent on available provider data. Exported graphics and historical calculations use the same selected numeric line and direction.
- Mobile history and box-score tables keep their first column visible. Chart outcomes use symbols and text in addition to color. Reduced-motion preferences are preserved.

Checks: typecheck, baseline lint, full unit suite and browser checks of navigation, calendar actions, filters and charts. The favorites agenda has isolated tests for Argentina midnight, game ordering, duplicate markets and unconfirmed teams.
