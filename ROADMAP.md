# Game Hub Roadmap (Organized)

## Current Status
- Core auth: login/register/verify/delete account
- Core games: Snake, Shooter, 2042, Pong, Breakout, Dodger
- Progress + points + skins + inventory + shop
- Leaderboard + top-3 + missions + achievements + friends
- Upload game from PC: ready (`/upload-game`)

## Priority Plan

### Phase 1: Stability (do first)
- [ ] Add server health check endpoint (`/api/health`)
- [ ] Add simple error logging format (request id + route + error)
- [ ] Add backup/export for database
- [ ] Add rate limit for auth endpoints

### Phase 2: Better Community Games
- [ ] Add edit/delete for uploaded games (owner only)
- [ ] Add like/dislike for uploaded games
- [ ] Add report button for bad game content
- [ ] Add pagination for uploaded games list

### Phase 3: Mobile UX
- [ ] Make all game canvases fixed mobile ratio (portrait-first)
- [ ] Add touch tutorial overlays per game
- [ ] Add vibration/haptic feedback (in Expo build)
- [ ] Add low-performance mode toggle

### Phase 4: LiveOps / Retention
- [ ] Daily login reward streak
- [ ] Weekly tournament mode with separate ranking
- [ ] Season reset timer in hub
- [ ] Event rewards in shop

### Phase 5: Social
- [ ] Friend challenges (score duel)
- [ ] Share game result card image
- [ ] Public player profile page

## Weekly Workflow
- Monday: bug fixing + deploy
- Tuesday: one gameplay improvement
- Wednesday: one social feature
- Thursday: mobile optimization
- Friday: new content (skin/game/challenge)
- Weekend: tournament + metrics review

## Definition Of Done (for each feature)
- [ ] Works on desktop
- [ ] Works on Android phone
- [ ] Works after page reload
- [ ] Points/skins sync correctly
- [ ] No console/server errors
- [ ] Pushed to GitHub and deployed

## Next 3 Tasks (recommended now)
1. Add delete/edit for uploaded games.
2. Add daily login reward.
3. Add mobile canvas ratio fix for all games.

