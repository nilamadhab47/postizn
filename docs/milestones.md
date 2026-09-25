# postN milestones

Inspiration from Postiz (`_reference/`). Write fresh code. Do not copy files, names, or error strings.

Postiz scheduling uses Temporal (`_reference/apps/orchestrator/`). postN uses Redis + BullMQ in the NestJS API (single replica).

**Already done (Phase 0):** monorepo, Postgres/Redis, Prisma MVP schema, dashboard shell, week calendar stub, compose stub, media/analytics placeholders.

**Phase 1 done.** Email + password login. Google OAuth is parked.

**Phase 2 done.** Channel connect with demo accounts until LinkedIn/X keys are pasted in `.env`.

---

## How to read this

Each item: **what**, **why**, **FE / BE**, **Postiz reference**.

Integrations ship one provider at a time. Product loop ships before extra platforms.

---

## Phase 1 — Auth that actually logs you in

Get a user into the app reliably. Postiz local login fails on HTTP without `NOT_SECURED` because cookies are `Secure + SameSite=None`.

| ID | What | Status | FE | BE | Reference |
|---|---|---|---|---|---|
| 1.1 | Google OAuth | **Parked** — files remain, routes unwired | No Google button | Guard/strategy not registered | `_reference/apps/backend/src/api/routes/auth.controller.ts` |
| 1.2 | Email + password register/login | **Done** | `/login`, `/register` | `POST /auth/register`, `POST /auth/login`, bcrypt hash | `_reference/apps/frontend/src/components/auth/register.tsx`, `login.tsx` |
| 1.3 | Session cookie works on `localhost` HTTP | **Done** | `credentials: include` | `sameSite: lax`, `secure` only in production | `_reference/apps/backend/src/api/routes/auth.controller.ts` (`NOT_SECURED`) |
| 1.4 | After login, land on Home | **Done** | Redirect `/dashboard` | Cookie then FE navigates to `/dashboard` | `_reference/apps/frontend/src/app/(app)/(site)/launches/page.tsx` |
| 1.5 | Logout clears cookie and returns to login | **Done** | Sign out in sidebar | `POST /auth/logout` | `_reference/apps/frontend/src/components/layout/logout.component.tsx` |

**Out of phase 1:** email activation, GitHub/Apple/Wallet/Farcaster login, OIDC.

---

## Phase 2 — Channel connect (integrations, one by one)

Provider interface first, then LinkedIn, then X. More platforms only after a post can publish.

| ID | What | Status | FE | BE | Reference |
|---|---|---|---|---|---|
| 2.1 | `BaseProvider`: `authenticate`, `refreshToken`, `uploadMedia`, `publishPost` | **Done** | — | Abstract class + registry | `_reference/libraries/nestjs-libraries/src/integrations/social/social.integrations.interface.ts` |
| 2.2 | Encrypt tokens at rest | **Done** | — | AES-GCM on `SocialAccount.accessToken` / `refreshToken` | `Integration` model in `_reference/libraries/nestjs-libraries/src/database/prisma/schema.prisma` |
| 2.3 | OAuth start + callback on API `:4000` | **Done** | Connect hits API with session cookie | State + PKCE; mock account if keys are empty | `_reference/apps/backend/src/api/routes/integrations.controller.ts` |
| 2.4 | **LinkedIn personal** (`w_member_social`, Posts API `/rest/posts`) | **Done (keys optional)** | Connect + list + disconnect | Live OAuth when `LINKEDIN_*` are set; otherwise demo channel | `_reference/libraries/nestjs-libraries/src/integrations/social/linkedin.provider.ts` |
| 2.5 | **X** (OAuth 2.0 PKCE, `media.write`, v2 tweet + v2 media upload) | **Done (keys optional)** | Same | Live OAuth when `TWITTER_*` are set; otherwise demo channel | `_reference/libraries/nestjs-libraries/src/integrations/social/x.provider.ts` |
| 2.6 | Channels page: avatar, handle, platform, disconnect, reconnect | **Done** | `/accounts` | `GET /social/channels`, `DELETE /social/accounts/:id` | `_reference/apps/frontend/src/components/launches/add.provider.component.tsx` |
| 2.7 | Plan limit: Free = 2 channels | **Done** | Disable Connect at cap | Enforce on connect | Postiz billing gates channels via `Subscription` |

**Next providers (after Phase 4 works):** Telegram → LinkedIn Page → YouTube → Google Business → Instagram. Files: `telegram.provider.ts`, `linkedin.page.provider.ts`, `youtube.provider.ts`, `gmb.provider.ts`, `instagram.provider.ts`.

---

## Phase 3 — Composer (major product)

This is the Postiz feature users live in. Global draft + per-channel override + draft / schedule / post now.

| ID | What | FE | BE | Reference |
|---|---|---|---|---|
| 3.1 | Channel picker (only connected accounts) | Checkboxes / chips | `GET /social/accounts` | `_reference/apps/frontend/src/components/new-launch/picks.socials.component.tsx` |
| 3.2 | Global text + per-channel override (`contentByPlatform`) | Global tab + tab per channel | Persist `Post.content` + `contentByPlatform` JSON | `_reference/apps/frontend/src/components/new-launch/store.ts`, `select.current.tsx`, `add.edit.modal.tsx` |
| 3.3 | Character counts per platform | Live count on selected tab | Limits in `@postn/shared` | Provider `maxLength` via `_reference/apps/frontend/src/components/new-launch/providers/` |
| 3.4 | Attach images to the post | Drag/drop → URL list | Media IDs on `Post.mediaUrls` | `_reference/apps/frontend/src/components/media/new.uploader.tsx` |
| 3.5 | Date/time picker (store UTC, show user timezone) | Picker | `scheduledAt` timestamptz | `_reference/apps/frontend/src/components/launches/helpers/date.picker.tsx` |
| 3.6 | Actions: Save draft, Schedule, Post now | Three buttons | `DRAFT` vs `SCHEDULED` vs immediate job | `_reference/apps/frontend/src/components/new-launch/manage.modal.tsx` (`schedule('draft'\|'now'\|'schedule')`); `POST /posts` in `posts.controller.ts` |
| 3.7 | Validate before save (missing channel, over limit, no time) | Inline errors | `POST /posts/validate` | `POST /posts/valid` in `_reference/apps/backend/src/api/routes/posts.controller.ts` |
| 3.8 | Simple preview column (text + image, not pixel-perfect) | Right pane | — | `_reference/apps/frontend/src/components/new-launch/provider-preview/` |

**Out of phase 3:** threads/comments delay, merge/separate, mentions, signatures, repeat, tags, Copilot popup, Polonto editor.

---

## Phase 4 — Publish engine

If this is weak, nothing else matters. Idempotent, refresh-then-post, independent `PostTarget` status.

| ID | What | FE | BE | Reference |
|---|---|---|---|---|
| 4.1 | BullMQ `publish-post` delayed job; store `jobId` | — | Enqueue on schedule; remove on cancel/reschedule | Postiz equivalent: Temporal `postWorkflowV112` in `_reference/apps/orchestrator/src/workflows/post-workflows/post.workflow.v1.1.2.ts` |
| 4.2 | Processor: PUBLISHING → provider → PUBLISHED / FAILED | Status badges | Refresh token if expiry &lt; 5 min; never double-post (`idempotencyKey`) | `_reference/apps/orchestrator/src/activities/post.activity.ts` (`postSocialPending`) |
| 4.3 | Per-target status (X can succeed, LinkedIn fail) | Show both | `PostTarget.status` + `failedReason` | Prisma `Post` rows per platform in Postiz; our `Post` + `PostTarget` |
| 4.4 | LinkedIn publish text + image | — | `POST /rest/posts` + image register/upload | `linkedin.provider.ts` |
| 4.5 | X publish text + image | — | v2 media initialize/append/finalize then `POST /2/tweets` | `x.provider.ts` |
| 4.6 | Retry failed target | Retry button on post | Re-enqueue one target | Postiz calendar error + reconnect; `State.ERROR` on `Post` |
| 4.7 | Redis AOF so delayed jobs survive restart | — | Already in docker-compose | — |

---

## Phase 5 — Calendar (major product)

Calendar is a working surface, not the homepage. Home is the pulse (stats, live posts, queue).

| ID | What | FE | BE | Reference |
|---|---|---|---|---|
| 5.1 | Week view with real posts, color by platform | `/calendar` | `GET /posts?from&to` | `_reference/apps/frontend/src/components/launches/launches.component.tsx`, `calendar.tsx`, `calendar.context.tsx` |
| 5.2 | Month + list views | View switch | Same query | `_reference/apps/frontend/src/components/launches/filters.tsx` |
| 5.3 | Click slot → compose at that time | Deep link `/compose?at=` | — | `_reference/apps/frontend/src/components/launches/new.post.tsx` |
| 5.4 | Click post → edit / reschedule / delete | Modal | Update post; move BullMQ job | `POST /posts/:id/date`, `DELETE /posts/:group`, `GET /posts/group/:group` |
| 5.5 | Empty state with “New post” | CTA | — | `launches.component.tsx` |

**Out of phase 5:** drag-and-drop, slot comments, customer filter, debug export.

---

## Phase 6 — Media library

| ID | What | FE | BE | Reference |
|---|---|---|---|---|
| 6.1 | Upload to R2 (or local disk until R2 keys exist) | `/media` + composer drop | Presign or proxy upload | `_reference/apps/frontend/src/components/media/media.component.tsx`, `new.uploader.tsx`; `_reference/apps/backend/src/api/routes/media.controller.ts` |
| 6.2 | List / delete / attach to post | Grid | `Media` table or URLs on Post | Prisma `Media` in Postiz schema |
| 6.3 | Image size/type limits per platform | Client warning | Reject on publish | Provider media rules in each `*.provider.ts` |

**Out of phase 6:** AI image/video, Polonto designer, third-party import.

---

## Phase 7 — AI (one hook)

| ID | What | FE | BE | Reference |
|---|---|---|---|---|
| 7.1 | “Generate 5 variations” from a topic or current draft | Button in composer | Claude Sonnet, return 5 strings | Postiz generator `_reference/apps/frontend/src/components/launches/generator/generator.tsx`; `POST /posts/generator` |
| 7.2 | Pick a variation into the editor | Click to apply | — | Composer store `store.ts` |

**Out of phase 7:** CopilotKit, Mastra agents, AI video, AgentMedia UGC, credits system. Refs if later: `_reference/apps/frontend/src/components/agents/`, `_reference/apps/backend/src/api/routes/copilot.controller.ts`.

---

## Phase 8 — History, failures, polish

| ID | What | FE | BE | Reference |
|---|---|---|---|---|
| 8.1 | Posts list: scheduled / published / failed | `/posts` filters | `GET /posts?status=` | Calendar list filter in `filters.tsx`; `Post.state` |
| 8.2 | Failed reason shown in UI | Tooltip / row | `failedReason` | Calendar error ring + tooltip in `calendar.tsx` |
| 8.3 | In-app notice when publish fails | Toast or bell | Write notification row | `_reference/apps/frontend/src/components/notifications/notification.component.tsx`; `notifications.controller.ts` |
| 8.4 | Onboarding: empty calendar → connect channel | Modal once | Flag on user | `_reference/apps/frontend/src/components/onboarding/onboarding.tsx` |
| 8.5 | Timezone on user (default `Asia/Kolkata`) | Settings | `User.timezone` | `_reference/apps/frontend/src/components/settings/global.settings.tsx` |
| 8.6 | Loading / empty / error states across shell | All pages | Consistent API errors | Layout `_reference/apps/frontend/src/components/new-layout/layout.component.tsx` |

---

## Phase 9 — India commercial

| ID | What | FE | BE | Reference |
|---|---|---|---|---|
| 9.1 | Marketing landing (hero, features, pricing) | `/` | Waitlist optional | — |
| 9.2 | Free limits: 2 channels, 30 posts/month | Disable with copy | Enforce | Postiz `Subscription` + billing gates |
| 9.3 | Razorpay checkout + webhook → `plan = PRO` | Billing page | Webhook signature verify | Postiz Stripe: `_reference/apps/backend/src/api/routes/billing.controller.ts`, `stripe.controller.ts`; FE `_reference/apps/frontend/src/components/billing/` |
| 9.4 | Failed-post email (Resend) | — | Worker on FAILED | `_reference/apps/orchestrator/src/workflows/send.email.workflow.ts` |

---

## Phase 10 — After it sells (Postiz extras)

Do not start these until Phases 1–4 are live.

| ID | What | Reference |
|---|---|---|
| 10.1 | LinkedIn Company Page | `linkedin.page.provider.ts` |
| 10.2 | Telegram | `telegram.provider.ts` |
| 10.3 | YouTube | `youtube.provider.ts` |
| 10.4 | Google Business Profile | `gmb.provider.ts` |
| 10.5 | Instagram (Meta review) | `instagram.provider.ts` |
| 10.6 | Repeat / recurring posts | `repeat.component.tsx`; `intervalInDays` on Post + child workflow |
| 10.7 | Tags | `tags.component.tsx`; `GET/POST /posts/tags` |
| 10.8 | Signatures | `signatures.component.tsx`; `signature.controller.ts` |
| 10.9 | Sets (templates) | `sets.tsx`; `sets.controller.ts` |
| 10.10 | RSS autopost | `autopost.tsx`; `autopost.controller.ts`; `autopost.workflow.ts` |
| 10.11 | Plugs (post-publish actions) | `plugs.tsx`; integration plugs metadata |
| 10.12 | Analytics | `platform.analytics.tsx`; `analytics.controller.ts` |
| 10.13 | Teams / invites | `teams.component.tsx`; `settings.controller.ts` |
| 10.14 | Webhooks | `webhooks.tsx`; `webhooks.controller.ts` |
| 10.15 | Public API + API keys | `public.integrations.controller.ts` (`/public/v1`) |
| 10.16 | Threads on X | Composer `global[]` / delay; `x.provider.ts` |
| 10.17 | Drag-and-drop calendar | `calendar.tsx`, `dnd.provider.tsx` |

---

## Explicitly not copying from Postiz

| Skip | Why | Reference (so we don’t wander in) |
|---|---|---|
| Gitroom GitHub stars / orgs | Not our product | `stars.and.forks.tsx`, `github.component.tsx` |
| Affiliate, UGC AgentMedia SSO | Their business, not ours | `top.menu.tsx`, `agent.media.modal.tsx` |
| CopilotKit + Mastra full agent | Too heavy for MVP | `copilot.controller.ts`, `mastra_*` tables |
| Stripe / RevenueCat | We use Razorpay | `billing.controller.ts` |
| Chrome extension | Later | `apps/frontend/src/app/(extension)/` |
| Skool, Kick, Whop, Nostr, Lemmy, VK, MeWe | Wrong audience | matching `*.provider.ts` |

---

## Suggested build order

```
1 Auth → 2 LinkedIn connect → 2 X connect
  → 3 Composer → 4 Publish (text, then image)
  → 5 Calendar with real data
  → 6 Media → 7 AI variations → 8 History
  → 9 Razorpay
  → 10 Next channel (Telegram or LinkedIn Page)
```

Rule: **no new provider until draft → schedule → published works on the ones we have.**
