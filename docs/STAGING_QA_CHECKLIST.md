# DUO OC Staging QA Checklist

Use this checklist before promoting the MVP from staging. Run tests with real staging auth users and the staging Supabase project.

## Prerequisites

- [ ] Apply migrations in Supabase SQL Editor if they are not already applied.
  Expected: These migrations complete without errors:
  - `20260523005000_htrack_plan_notifications.sql`
  - `20260523006000_itrack_post_hangout_reviews.sql`
  - `20260523007000_jtrack_duo_sanctions.sql`
- [ ] Create at least four test users: User A, User B, User C, User D.
  Expected: Each user can sign in and reach the onboarded app.
- [ ] Create or form Duo AB with User A and User B.
  Expected: Duo AB appears in Me under My Duos for both users.
- [ ] Create or form Duo CD with User C and User D.
  Expected: Duo CD appears in Me under My Duos for both users.
- [ ] Optional: create an additional duo for User A to test multi-duo behavior.
  Expected: User A sees more than one duo in Me, up to the 3-duo limit.

## A. Navigation

- [ ] Confirm the bottom nav has exactly Home, Explore, Hangouts, Chat, Me.
  Expected: No extra tabs appear, and My Duo is not a bottom nav tab.
- [ ] Tap Home.
  Expected: Home loads and shows the start-duo state for no-duo users or the plan/hangout summary for users with duos.
- [ ] Tap Explore.
  Expected: Explore loads duo cards and open plan previews when available.
- [ ] Tap Hangouts.
  Expected: Hangouts loads requests, plans, confirmed hangouts, and past hangouts sections without crashing.
- [ ] Tap Chat.
  Expected: Chat list loads or shows the no-chats empty state.
- [ ] Tap Me.
  Expected: Me renders the My Duos management surface with Profile, My Duos, Safety, and Settings sections.
- [ ] Open notification bell from Home.
  Expected: Notification panel opens, shows notifications or "No notifications yet.", and can be dismissed.
- [ ] Tap a plan or hangout notification.
  Expected: The app routes to Hangouts.

## B. No-Duo Flow

- [ ] Sign in as a fresh user with no duo.
  Expected: Home and Me show a clear "Find a homie" path.
- [ ] Open Find Homie.
  Expected: The page explains: "A duo starts with two people" and "Find a homie, then set up your duo profile together."
- [ ] Send a homie request from User A to User B.
  Expected: Request sends once and the button changes to a sent or pending state.
- [ ] Sign in as User B and open the homie inbox.
  Expected: User B sees User A's request.
- [ ] Accept the homie request.
  Expected: Duo AB is created and User B sees success copy.
- [ ] Return to Me for User A and User B.
  Expected: Duo AB appears in My Duos for both users.

## C. Multi-Duo Flow

- [ ] Sign in as a user with more than one duo.
  Expected: Me shows all duos, up to 3.
- [ ] Start Create Plan from Me on a specific duo.
  Expected: Create Plan opens with that duo selected when route state supports it.
- [ ] Create an open plan as one selected duo.
  Expected: The plan is created for that duo only.
- [ ] Request to join an open plan as a selected duo.
  Expected: The request is associated with the selected requester duo.
- [ ] View an open plan owned by one of your own duos.
  Expected: Your own duo cannot request to join its own plan.
- [ ] Open Hangouts.
  Expected: Requests and plans appear under the correct duo labels.

## D. Open Plan Flow

- [ ] Sign in as User A or B and create an open plan for Duo AB.
  Expected: Duo AB has one active open plan.
- [ ] Sign in as User C or D and open Explore.
  Expected: Duo CD can see Duo AB's open plan if not blocked or restricted.
- [ ] Toggle the Open plans filter in Explore.
  Expected: Only duos with active open plans remain visible.
- [ ] From Duo AB detail, request to join the plan as Duo CD.
  Expected: The request is submitted and duplicate requests are blocked.
- [ ] Sign in as User A or B and open notifications.
  Expected: A `plan_request` notification is visible and routes to Hangouts.
- [ ] Accept Duo CD's request to join.
  Expected: A confirmed hangout is created for Duo AB and Duo CD.
- [ ] Sign in as User C or D and open notifications.
  Expected: A `plan_accepted` notification is visible and routes to Hangouts.
- [ ] Open Hangouts for both sides.
  Expected: The confirmed hangout appears for both duos.

## E. Hangout Request Flow

- [ ] Find a duo that does not have an open plan.
  Expected: Duo Detail shows Send hangout request.
- [ ] Send a hangout request.
  Expected: The request submits successfully and shows a sent state.
- [ ] Open Hangouts as the sender.
  Expected: The request appears in outgoing or sent state.
- [ ] Open Hangouts as the receiving duo.
  Expected: The request appears as an incoming hangout request.
- [ ] Accept the hangout request.
  Expected: A confirmed hangout is created.
- [ ] Open Hangouts as both sides.
  Expected: The confirmed hangout appears for both duos.

## F. Expiration and Past Hangouts

- [ ] Create or modify an open plan with a past date/time.
  Expected: The expired open plan does not appear in Explore.
- [ ] Attempt to request to join an expired open plan.
  Expected: The request is rejected and no confirmed hangout is created.
- [ ] Create or modify a confirmed hangout with a past date/time.
  Expected: The hangout appears in Past hangouts.
- [ ] Create or modify pending, outgoing, or countered hangouts with past date/time.
  Expected: They do not appear as active items.
- [ ] Open Home summary after expiration setup.
  Expected: Expired items are not counted as active confirmed hangouts, active requests, or open plans.

## G. Chat

- [ ] Create or find a confirmed hangout.
  Expected: The hangout appears in Chat.
- [ ] Open the chat thread.
  Expected: The thread loads for users who belong to either confirmed duo.
- [ ] Send a message if chat is enabled in staging.
  Expected: Message sends and appears in the thread.
- [ ] Sign in as the other participant user and open the same chat.
  Expected: The message is visible.
- [ ] Confirm chat badge behavior.
  Expected: Badge appears when there is confirmed chat activity and clears after opening Chat.
- [ ] Keep a past hangout with chat history.
  Expected: Past hangouts do not break existing chat history.

## H. Review

- [ ] Open Hangouts with a past confirmed hangout.
  Expected: Past hangout shows "How was it?"
- [ ] Submit a Yes review.
  Expected: Review saves and the reviewed badge appears.
- [ ] Submit a Maybe or No review on another past hangout.
  Expected: Review saves and the selected response is stored.
- [ ] Try to review the same hangout again.
  Expected: Duplicate review is blocked or the reviewed state prevents resubmission.
- [ ] Submit a review with the safety flag enabled.
  Expected: Safety follow-up card opens.
- [ ] Dismiss or complete the safety follow-up.
  Expected: Hangouts remains usable and the review remains saved.

## I. Safety

- [ ] Block a duo from the safety follow-up or report/block surface.
  Expected: Block succeeds and the blocked duo disappears from Explore.
- [ ] Report a duo with a safety reason.
  Expected: Report submits and user sees "Report submitted."
- [ ] Submit the same report reason from the same user again.
  Expected: User sees "You already reported this duo for this reason."
- [ ] Attempt to report your own duo.
  Expected: Self-report is blocked.
- [ ] Submit a review or report category of "Not a fit" where available.
  Expected: It does not count toward sanctions.
- [ ] Confirm report details are private.
  Expected: Public UI does not expose report counts, report reasons, or who reported.

## J. Sanctions

- [ ] Have three unique users report the same duo for the same sanction-counting category.
  Expected: An active `duo_sanctions` row is created with `sanction_type = restricted`.
- [ ] Open Explore as another user.
  Expected: The restricted duo is hidden from Explore.
- [ ] Sign in as a member of the restricted duo and try to create a plan.
  Expected: Plan creation is blocked with "This duo cannot create new plans right now."
- [ ] Sign in as a member of the restricted duo and try to request to join a plan.
  Expected: Request is blocked with "This duo is not available right now."
- [ ] Sign in as another duo and try to request the restricted duo's plan or interaction surface.
  Expected: Request is blocked or the restricted duo is unavailable.
- [ ] Confirm existing chats remain visible.
  Expected: Existing chat history is not deleted.
- [ ] Confirm existing hangouts and reviews remain visible.
  Expected: Existing records are not deleted or hidden from their historical surfaces.
- [ ] Confirm no notification is sent to the restricted duo.
  Expected: The restriction remains internal/private.

## K. Empty States

- [ ] New no-duo user opens Me.
  Expected: User sees "You don't have a duo yet." and a "Find a homie" action.
- [ ] User with no hangouts opens Hangouts.
  Expected: User sees a clear no-hangout or no-plan state.
- [ ] User with no open plans opens Explore with Open plans filter.
  Expected: User sees a clear no-open-plans state.
- [ ] User with no chats opens Chat.
  Expected: User sees "No chats yet." and no crash.
- [ ] User with no notifications opens notification bell.
  Expected: User sees "No notifications yet."
- [ ] User with three duos opens Me.
  Expected: User sees "You can create up to 3 duos." and no create-another-duo action.

## Known Limitations

- Manual migration application may be required in Supabase SQL Editor for recent staging migrations.
- The Vite build may show a large chunk warning; this is non-blocking for MVP staging.
- There is no admin moderation dashboard yet.
- There is no invite link, phone contacts, or QR code flow yet.
- Safety sanctions are lightweight restrictions, not bans.
- Sanctions do not delete profiles, duos, messages, hangouts, reviews, reports, or plans.
