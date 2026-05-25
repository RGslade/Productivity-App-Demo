# Productivity Mobile App

Productivity Mobile App is an Expo React Native application for organising the practical parts of independent adult life: tasks, checklists, budgeting, notes, education records, documents, news, useful links, subscriptions, ads, and AI-assisted planning.

The app is aimed at young adults and early-career users who need a single mobile workspace for day-to-day organisation while preparing for greater independence. Its central problem is fragmentation: budgeting, moving-out preparation, task tracking, document references, and support links often live in separate tools. This project brings those workflows into one authenticated mobile experience with a Supabase-backed data model and a premium AI assistant called LifeNest.

This repository is a public demo version. It preserves the app architecture and core client-side implementation, but intentionally excludes private environment files, production credentials, service-role keys, release notes, account-specific provider configuration, and any private backend secrets.

## Key Features

- **Authenticated personal workspace**: Supabase authentication protects user-specific app data and routes unauthenticated users to the login flow. This allows tasks, notes, budgets, settings, and AI conversations to be associated with the signed-in profile.
- **Dashboard overview**: The dashboard summarises tasks, checklists, monthly finances, recent notes, latest grades, news headlines, and recent LifeNest conversations. Premium users can customise dashboard card order and visibility.
- **Tasks and checklists**: Users can create and manage standard tasks, checklist-style items, due dates, reminders, categories, completion progress, and premium preparation workflows such as Moving Out.
- **Budget tracking**: Income and expenses are stored as transactions, grouped by month, and formatted using the user’s preferred currency symbol.
- **Notes, documents, and education grades**: The app includes persistent notes, document records with local file export support, and education grade tracking for personal admin and reference.
- **LifeNest AI assistant**: LifeNest supports independent-living guidance around budgeting, housing, employment readiness, daily routines, and related planning. The client calls a Supabase Edge Function so OpenAI credentials stay server-side in production.
- **Subscriptions, virtual currency, and ads**: RevenueCat manages subscriptions, remove-ads purchases, and LifeNest token products. Google AdMob provides banner and interstitial ads for non-ad-free users. Local development uses Google AdMob test IDs.
- **Notifications and app lifecycle handling**: Expo Notifications, Notifee, background task registration, and app-state hooks support reminder behaviour and foreground refresh flows.
- **Theming and persisted settings**: User preferences such as theme, font, notification settings, budget currency, dashboard layout, and LifeNest appearance are stored through settings services. Some local preferences use AsyncStorage.
- **Curated links and regional content**: The Links area and regional markdown files provide support/resource references, while the news screen reads Sky News RSS feeds where supported.
- **Housing and job search helpers**: Housing search can use a local RapidAPI key, a backend function, or fallback demo listings. Job search currently redirects to Indeed UK using the user’s query and location; older Reed API code is retained only as commented reference.

## Technology Stack

- **React Native and Expo** are the core mobile runtime. Expo provides the app shell, native configuration, splash/icon setup, device APIs, notifications, fonts, linking, location permissions, and development tooling.
- **Expo Router** is used for file-based navigation under `app/`, including auth screens, feature screens, detail/edit routes, and stack configuration in `app/ThemeWrapper.tsx`.
- **TypeScript and JavaScript** provide typed models, service contracts, hooks, screens, and provider interfaces. The project uses TypeScript path aliases such as `@/services/...`.
- **Supabase** is the primary backend integration for auth, database access, RPC calls, and Edge Function invocation. Public client values use `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`; private service-role keys are not part of the mobile app.
- **Supabase Edge Functions** are referenced for `ai-assistant`, `ad-config`, `billing-config`, and housing search behaviour. In production these functions are the boundary for OpenAI keys, AdMob unit configuration, RevenueCat SDK keys, and other sensitive provider values.
- **OpenAI API integration** is implemented indirectly through the LifeNest service. The app sends conversation actions to a backend function and records chat history and token usage in Supabase. The OpenAI SDK dependency is present, but production key usage belongs on the server side.
- **RevenueCat** is used for subscription state, paywalls, restore purchases, customer center, virtual currency, and product/entitlement resolution. It is core for monetisation, but local review can run with purchases unavailable or a development SDK key.
- **Google AdMob** is used through `react-native-google-mobile-ads`. The app config contains Google test app IDs, and the runtime service falls back to test banner/interstitial unit IDs during development when backend ad config is unavailable.
- **TanStack Query** manages server state for tasks, notes, transactions, grades, settings, news-adjacent data, and cache invalidation. It keeps screen components focused on UI and mutation flow.
- **AsyncStorage** persists Supabase auth sessions and selected local app preferences, including theme/dashboard-style settings where service code uses local storage.
- **Expo Notifications, Notifee, Task Manager, Background Fetch, Device, Location, NetInfo, Clipboard, DateTimePicker, Picker, Reanimated, Gesture Handler, Screens, and Safe Area Context** support mobile-specific UX, permissions, background work, connectivity checks, native controls, and navigation performance.
- **Skia and sensors** are not currently dependencies in this public demo. They should not be assumed to exist unless added in a future version.

## Architecture

The repository separates routing, UI, data access, cross-cutting providers, and domain types:

- `app/` contains Expo Router screens and navigation structure. Route groups such as `app/(auth)` and `app/(tabs)` separate authentication from the main dashboard experience.
- `components/` contains reusable themed primitives, UI controls, legal/update gates, ad display, connection tests, and small presentation helpers.
- `hooks/` contains screen-facing data hooks, permission/location/notification helpers, app-state handling, and LifeNest prompt configuration.
- `services/` contains domain and integration logic. Screens call services through hooks instead of embedding Supabase, RevenueCat, AdMob, OpenAI, or file-system details directly.
- `providers/` contains global context providers for authentication, TanStack Query, theme, and RevenueCat purchase state.
- `types/` defines shared contracts for users, todos, transactions, notes, documents, settings, subscriptions, chat, links, jobs, housing, news, and feedback.
- `constants/` contains shared colours, fonts, subscription identifiers, backend resource names, currency symbols, employment values, and LifeNest usage limits.
- `database/` contains historical SQL migration snapshots for reference. These files should not be treated as a complete production database export.
- `docs/` contains regional-link source material and AI prompt planning notes for public reference.

State management is intentionally split by ownership:

- **Server state** is handled with TanStack Query hooks, giving list/detail screens predictable loading, caching, invalidation, and mutation behaviour.
- **Authentication state** lives in `AuthProvider`, which hydrates Supabase sessions, loads the user profile, handles OAuth callbacks, enforces route guards, and clears notification state on logout.
- **Purchase state** lives in `RevenueCatProvider`, which configures RevenueCat, syncs subscriber attributes, tracks entitlements, virtual currency, remove-ads status, and LifeNest usage periods.
- **Local UI state** stays inside screens for forms, modals, loading flags, selected tabs, active filters, and transient alerts.
- **Persisted settings** are accessed through `settingsService` and related hooks so theme, display, notification, budget, dashboard, and LifeNest preferences can be reused across screens.
- **App/game state** in this repo is app workflow state rather than game state: dashboard layout, task/checklist progress, LifeNest conversations, and notification lifecycle are separated into services and providers to keep screens maintainable.

This structure keeps feature code reviewable: screens describe interaction flow, hooks manage data orchestration, services encapsulate backend/provider behaviour, providers manage global runtime state, and types document the contracts between them.

## Backend and API Design

Supabase is the app’s backend abstraction. `lib/supabase.ts` creates a client with AsyncStorage-backed auth persistence. `services/databaseService.ts` wraps common table operations, auth calls, OAuth code exchange, password reset, RPC calls, and Edge Function invocation.

Important integrations:

- **LifeNest AI**: `services/lifeNestService.ts` invokes the `ai-assistant` Edge Function for creating conversations, listing models, sending messages, generating checklists, and receiving assistant output. The mobile app passes user input and scoped instructions; production OpenAI API keys remain in Supabase function secrets.
- **Ad configuration**: `services/adMobService.ts` calls `ad-config` to fetch platform-specific ad unit IDs. In local development it falls back to Google test ad units.
- **Billing configuration**: `services/subscriptionService.ts` calls `billing-config` to fetch the platform-specific RevenueCat SDK key unless a development key is provided locally.
- **Housing search**: `services/housingService.ts` can use a local RapidAPI key in development, call a backend function in production-style flows, or return fallback sample listings when remote services are unavailable.
- **News**: `services/newsService.ts` fetches and parses public Sky News RSS feeds with connectivity checks, timeout handling, and retries.
- **Job search**: `services/jobService.ts` currently redirects users to Indeed UK with encoded search parameters. Older direct API code is commented out and not active.

Private Supabase service-role credentials, OpenAI keys, AdMob production unit IDs, RevenueCat production SDK keys, RapidAPI secrets, signing credentials, and other provider secrets are intentionally removed from this repository. Public demo behaviour is designed to fail closed, use test IDs, or show local fallback data where that support exists.

## Security

- Secrets are excluded from Git through `.gitignore`. `.env.example` is the only environment file intended to be tracked.
- Mobile-safe values use `EXPO_PUBLIC_` because they are bundled into the client. Do not place private keys, service-role credentials, OpenAI API keys, RevenueCat secret keys, or production-only provider secrets in Expo public variables.
- Sensitive API calls are designed to cross a server-side boundary through Supabase Edge Functions. Production OpenAI, AdMob config, billing config, and provider credentials should live in Supabase function secrets or provider dashboards.
- Supabase auth is assumed for user-scoped data. Database tables should enforce Row Level Security policies so authenticated users can access only their own rows, while shared/global tables expose only intended public data.
- Logs avoid printing full auth emails in several auth paths by masking email addresses before diagnostics.
- The public demo uses safe AdMob test IDs and placeholder app identifiers. Production bundle IDs, store signing keys, and release credentials are not included.

## Running Locally

Prerequisites:

- Node.js 20 is recommended. EAS profiles pin Node `20.19.4` for development and production builds.
- npm, Expo CLI through `npx expo`, Android Studio for Android builds, and Xcode/macOS for iOS builds.
- A Supabase project with matching tables/functions is required for full authenticated app behaviour. Private server-side keys are not required in the mobile app.

Setup:

```bash
git clone <repository-url>
cd "Productivity Mobile App"
npm install
cp .env.example .env.local
npm start
```

Platform commands:

```bash
npm run android
npm run ios
npm run lint
```

The app can be reviewed without private production keys. Public Supabase URL/anon configuration is still required for login and database-backed screens. If Edge Function secrets are missing, AI, billing config, production ad config, and housing API calls may be unavailable; supported demo paths fall back to safe test ads, local development values, or sample listings.

Optional local services:

- Supabase auth/database: required for full app navigation and persistence. For a public demo, provide setup as SQL migrations or Supabase CLI migrations rather than a private production dump.
- Supabase Edge Functions: required for production-like AI, billing config, ad config, and housing search.
- RevenueCat: optional for local review; purchase screens show configuration guidance when unavailable.
- Google AdMob: optional for local review; test IDs are used for safe demo rendering.
- RapidAPI/Zoopla: optional; housing search has fallback sample listings.

## Environment Example

Copy `.env.example` to `.env.local` and fill only the values needed for your review environment.

```env
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=

EXPO_PUBLIC_BACKEND_FUNCTION_AD_CONFIG=
EXPO_PUBLIC_BACKEND_FUNCTION_AI_ASSISTANT=
EXPO_PUBLIC_BACKEND_FUNCTION_BILLING_CONFIG=

EXPO_PUBLIC_REVENUECAT_SDK_KEY=

EXPO_PUBLIC_ADMOB_BANNER_ANDROID=ca-app-pub-3940256099942544/9214589741
EXPO_PUBLIC_ADMOB_INTERSTITIAL_ANDROID=ca-app-pub-3940256099942544/1033173712
EXPO_PUBLIC_ADMOB_BANNER_IOS=ca-app-pub-3940256099942544/2435281174
EXPO_PUBLIC_ADMOB_INTERSTITIAL_IOS=ca-app-pub-3940256099942544/4411468910

EXPO_PUBLIC_RAPIDAPI_KEY=
EXPO_PUBLIC_ZOOPLA_RAPIDAPI_HOST=
```

## Supabase Database Setup

This repository includes a sanitised Supabase CLI setup under `supabase/`:

- `supabase/config.toml`: local Supabase service ports, auth redirect URLs, and demo Edge Function configuration.
- `supabase/migrations/`: executable schema, indexes, triggers, Row Level Security policies, and reviewer-safe RPC functions.
- `supabase/seed.sql`: one demo auth user and representative sample rows for app config, profile, settings, tasks, checklists, transactions, notes, grades, documents, feedback, job applications, notifications, dashboard customisation, and LifeNest chat/usage data.
- `supabase/functions/`: local demo Edge Functions for `ai-assistant`, `ad-config`, `billing-config`, `housing-search`, and `reed-job-details`.

Run the local backend:

```bash
supabase start
supabase db reset
supabase functions serve
```

Then copy the local API URL and anon key printed by `supabase status` into `.env.local`:

```env
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

Demo login:

```text
Email: demo@example.com
Password: DemoPass123!
```

The public Supabase setup intentionally uses safe demo data and Google AdMob test IDs. It does not include production auth users, service-role credentials, OpenAI keys, RevenueCat production keys, RapidAPI keys, signing credentials, or private app configuration.

The included Edge Functions are production-shaped: they call real provider APIs when Supabase secrets are configured and fall back to safe demo responses when secrets are absent. Configure function secrets with your own provider credentials:

```bash
supabase secrets set OPENAI_API_KEY=
supabase secrets set REVENUECAT_SDK_KEY_ANDROID=
supabase secrets set REVENUECAT_SDK_KEY_IOS=
supabase secrets set REVENUECAT_TEST_SDK_KEY_ANDROID=
supabase secrets set REVENUECAT_TEST_SDK_KEY_IOS=
supabase secrets set ADMOB_BANNER_ANDROID=
supabase secrets set ADMOB_INTERSTITIAL_ANDROID=
supabase secrets set ADMOB_BANNER_IOS=
supabase secrets set ADMOB_INTERSTITIAL_IOS=
supabase secrets set RAPIDAPI_KEY=
supabase secrets set ZOOPLA_RAPIDAPI_HOST=
supabase secrets set REED_API_KEY=
supabase secrets set STRIPE_SECRET_KEY=
supabase secrets set STRIPE_PRICE_ID=
```

`supabase/functions/.env.example` lists the server-side keys expected by the demo functions. These are intentionally separate from Expo `EXPO_PUBLIC_` variables because they must not be bundled into the mobile app.

## Testing and Quality

Current quality checks:

```bash
npm run lint
```

Manual integration testing should cover:

- Register, login, logout, password reset, OAuth callback handling, and session timeout behaviour.
- Dashboard loading, pull-to-refresh, premium dashboard customisation, and route guards.
- Create/edit/delete flows for tasks, checklists, notes, grades, and transactions.
- LifeNest conversation creation, usage limits, token balance display, checklist generation, reporting, and missing-backend error states.
- RevenueCat unavailable/configured states, restore purchases, customer center, remove-ads state, and token product display.
- AdMob banner/interstitial rendering with test IDs.
- Notifications, due-date reminders, app foreground navigation normalisation, and mandatory update gating.
- Offline or remote-service failure paths for news and housing.

### Planned Testing Improvements

- Add Jest coverage for service-layer mapping, token usage calculations, date/currency formatting, and fallback behaviour.
- Add React Native Testing Library tests for screen states, form validation, route guards, and provider-driven UI.
- Add E2E smoke tests for login, dashboard load, core CRUD flows, and purchase-unavailable states with Detox or Maestro.
- Add CI checks for linting, type checking, dependency audit output, and a small suite of deterministic unit tests.

## Build and Release

Expo Application Services is configured through `eas.json`.

- `development`: creates an internal development-client build and pins Node `20.19.4`.
- `preview`: creates an internal distribution build suitable for reviewer/device testing.
- `production`: enables auto-increment and pins Node `20.19.4` for release builds.

Build commands:

```bash
npm run build
npm run build:android
npm run build:ios
```

Android builds can produce APK/AAB artifacts depending on EAS configuration and requested profile. iOS builds require the usual Apple Developer credentials. The public `app.json` uses placeholder package identifiers, owner, EAS project ID, and Google AdMob test app IDs; production identifiers and signing credentials should be supplied outside this repository.

## Screenshots and Demo

Add production or demo media here when available:

- `docs/screenshots/dashboard.png` - Dashboard overview with tasks, finances, LifeNest, notes, grades, and news cards.
- `docs/screenshots/tasks-checklists.png` - Task and checklist management with progress, due dates, and categories.
- `docs/screenshots/budget.png` - Monthly income, expenses, and transaction entry flow.
- `docs/screenshots/lifenest-chat.png` - LifeNest conversation with token usage and reporting controls.
- `docs/screenshots/subscribe.png` - RevenueCat subscription and LifeNest token purchase screen.
- `docs/screenshots/settings.png` - Profile, theme, notifications, purchases, and app settings.
- Demo video: `<add link when available>`.

## Known Limitations

- Private production credentials and service-role keys are removed by design.
- Supabase schema snapshots in `database/` are reference material, not a guaranteed one-command local backend.
- Full app persistence requires a compatible Supabase project and RLS policies.
- LifeNest AI requires the `ai-assistant` Edge Function and server-side OpenAI configuration; without it, model listing and assistant responses may be unavailable.
- RevenueCat production billing requires store products, offerings, entitlements, virtual currency, and server-side or local SDK key configuration.
- AdMob production ad unit IDs are not included. Demo mode uses Google test IDs.
- Housing search falls back to sample listings unless RapidAPI or the backend function is configured.
- Job search currently redirects to Indeed UK rather than returning in-app job results.
- Automated tests are not yet present in this public demo.
- Some public-demo values are anonymised, including publisher details, package identifiers, EAS project ID, and store metadata.

## Roadmap

- Add Jest and React Native Testing Library coverage for services, hooks, providers, and critical screens.
- Add E2E smoke tests for auth, dashboard, CRUD flows, LifeNest unavailable states, and purchase-unavailable states.
- Add CI/CD for linting, type checking, tests, dependency review, and EAS build validation.
- Provide Docker/local Supabase setup scripts or documented seed data for reviewers.
- Improve offline support for tasks, notes, settings, and dashboard summaries.
- Add richer error boundaries and user-facing retry states around backend, AI, billing, and network failures.
- Improve accessibility for form controls, touch targets, announcements, colour contrast, and keyboard/screen-reader flows.
- Optimise performance on large task, transaction, note, and chat histories through pagination or incremental queries.
- Expand analytics with privacy-conscious event tracking for feature usage, conversion funnels, and failure diagnostics.
- Harden backend documentation around RLS policy assumptions, Edge Function contracts, and release environment management.

## For Technical Reviewers

Start with these files:

- `app/_layout.tsx` and `app/ThemeWrapper.tsx`: provider composition, navigation setup, legal acceptance, ads, update gating, and app foreground behaviour.
- `providers/AuthProvider.tsx`: Supabase session hydration, profile loading, auth route guards, OAuth callback handling, notification lifecycle cleanup, and masked diagnostics.
- `providers/RevenueCatProvider.tsx`: purchase state orchestration, entitlement sync, virtual currency refresh, subscriber attributes, paywalls, restore flows, and LifeNest usage-period sync.
- `services/databaseService.ts`: Supabase table wrappers, auth operations, RPC invocation, Edge Function invocation, and shared error handling.
- `services/lifeNestService.ts`: AI conversation flow, backend function contract, chat persistence, token accounting, checklist generation, and assistant feedback reporting.
- `services/subscriptionService.ts`: RevenueCat SDK key resolution, entitlement/product mapping, virtual currency handling, price formatting, and platform safeguards.
- `services/adMobService.ts` and `components/AdDisplay.tsx`: server-configured ad IDs, development test fallbacks, banner/interstitial lifecycle, and ad-free gating.
- `hooks/useTodos.ts`, `hooks/useTransactions.ts`, `hooks/useSettings.ts`, `hooks/useNotes.ts`, and `hooks/useEducationGrades.ts`: TanStack Query patterns, cache keys, mutations, and screen-facing data APIs.
- `services/dashboardCustomizationService.ts`: local/persisted dashboard layout state and premium customisation behaviour.
- `constants/backendResources.ts`, `constants/subscription.ts`, and `constants/lifeNestUsage.ts`: backend resource naming, monetisation identifiers, and AI usage policy constants.

These areas show the main architectural decisions: thin screens, reusable UI primitives, typed service layers, React Query for server state, provider-owned auth/purchase state, server-side boundaries for sensitive integrations, and mobile-specific handling for notifications, ads, storage, routing, and app lifecycle.
