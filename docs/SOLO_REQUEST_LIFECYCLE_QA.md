# Solo Request Lifecycle QA

Manual checks for `solo_requests.status` lifecycle changes.

## Expected Rules

- A duplicate send is blocked only when the sender already has a `pending` request to that same recipient.
- Historical request states (`accepted`, `declined`, `cancelled`, `expired`, `matched`) do not block a new request.
- Active matches still hide/block the same pair from Explore.
- Ended matches do not permanently hide the same person from Explore.

## Manual Verification

1. Send request once, then try sending again while it is still pending.
   - Expected: blocked with `You already have a pending request with this person.`
2. Cancel a pending sent request.
   - Expected: row becomes `cancelled`; sending to the same person later works.
3. Decline a received request.
   - Expected: row becomes `declined`; sender can later send again.
4. Accept a received request.
   - Expected: an active `solo_matches` row exists and the request row becomes `matched`.
5. Leave the chat.
   - Expected: match becomes `ended`; the pair can be requested again if they appear in Explore.
6. Production backfill sanity check.
   - Expected: old request rows for pairs that already have a match are `matched`, not `pending`.
