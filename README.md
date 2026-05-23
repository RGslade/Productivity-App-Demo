# Productivity Mobile App

Productivity Mobile App is an Expo React Native mobile app for everyday planning, budgeting, tasks, notes, documents, helpful links, news, subscriptions, ads, and AI-assisted guidance.

## Public Repository Notes

This repository is anonymised for public sharing. It intentionally omits local environment files, private provider credentials, detailed database schema notes, internal release notes, and account-specific service configuration.

The app references Supabase as the backend provider for auth and persistence. Private Supabase project values, provider secrets, and edge-function secrets should stay outside Git.

## Features

- Authentication and profile management
- Budget and transaction tracking
- Tasks, checklists, notes, grades, and documents
- Helpful links and curated news
- AI-assisted planning workflow
- Subscription and token-based purchase flows
- Ads, theming, notifications, and app update gating

## Architecture

- `app/` contains Expo Router screens and navigation setup.
- `components/` contains shared UI primitives and reusable app components.
- `providers/` contains global providers for auth, theme, data fetching, and purchases.
- `hooks/` contains screen-facing data and platform hooks.
- `services/` contains backend, billing, documents, notifications, and domain logic.
- `types/` contains shared TypeScript contracts.
- `database/` contains historical SQL migration snapshots for local reference.

## Key Dependencies

- Expo and Expo Router
- React Native
- TanStack Query
- Supabase client library
- RevenueCat purchases
- Google Mobile Ads

## Environment

Create a local `.env.local` for any runtime values needed during development. Do not commit `.env`, `.env.local`, provider API keys, signing keys, or production service credentials.

## Development

```bash
npm install
npm run start
npm run android
npm run ios
npm run lint
```

## Release Checklist

- Confirm the public app name and package identifiers in `app.json`.
- Keep production secrets in provider dashboards or server-side configuration.
- Review privacy policy and store data declarations against real app behavior.
- Increment platform build numbers for each store upload.
