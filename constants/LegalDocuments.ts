import { PROJECT_OWNER_NAME, PROJECT_SUPPORT_EMAIL, PROJECT_WEBSITE } from '@/constants/ProjectInfo';

export type LegalDocumentKey = 'terms' | 'privacy' | 'lifenest';

export type LegalDocumentSection = {
  heading: string;
  body: string[];
};

export type LegalDocument = {
  key: LegalDocumentKey;
  title: string;
  shortTitle: string;
  version: string;
  updatedAt: string;
  route: `/legal/${LegalDocumentKey}`;
  sections: LegalDocumentSection[];
};

const contactLine = `Contact: ${PROJECT_SUPPORT_EMAIL}. Portfolio: ${PROJECT_WEBSITE}.`;

export const LEGAL_DOCUMENTS: Record<LegalDocumentKey, LegalDocument> = {
  terms: {
    key: 'terms',
    title: 'Terms of Service',
    shortTitle: 'Terms of Service',
    version: 'v1',
    updatedAt: '25 July 2026',
    route: '/legal/terms',
    sections: [
      {
        heading: 'Who these terms apply to',
        body: [
          `These terms apply when you use Productivity Mobile App, a personal portfolio project maintained by ${PROJECT_OWNER_NAME}. ${contactLine}`,
          'By creating an account, using the app, or buying a subscription or token bundle, you agree to these terms and any additional terms shown at the point of purchase.',
        ],
      },
      {
        heading: 'What the app provides',
        body: [
          'Productivity Mobile App helps users organise practical independent-living tasks such as budgeting, todo lists, notes, education records, documents, helpful links, news and LifeNest AI chat.',
          'The app is a planning and information tool. It does not provide financial advice, legal advice, medical advice, emergency support, counselling, or professional housing or employment advice.',
          'You are responsible for checking information before relying on it, especially where a decision could affect money, safety, health, housing, employment, legal rights or benefits.',
        ],
      },
      {
        heading: 'Accounts and acceptable use',
        body: [
          'You must provide accurate account information and keep your sign-in details secure.',
          "You must not use the app to break the law, harm others, harass others, upload malicious content, interfere with the service, reverse engineer protected parts of the service, or attempt to access another user's account or data.",
          'We may suspend or close access where we reasonably believe an account is misused, creates risk for other users, or breaches these terms.',
        ],
      },
      {
        heading: 'Subscriptions, purchases and tokens',
        body: [
          'LifeNest Premium, Remove Ads and LifeNest token bundles may be offered through Apple App Store, Google Play, Stripe, RevenueCat or another checkout provider shown in the app.',
          'Subscriptions renew automatically unless cancelled through the store or checkout provider that manages the purchase. The checkout page will show the price, billing period and payment terms before payment.',
          'LifeNest token bundles are digital consumable balances. Tokens are added to the signed-in account after the payment provider and entitlement system confirm the purchase. The checkout or app-store flow will explain any cancellation or refund rights that apply before payment.',
          'Refunds, cancellation rights and billing management may be handled by the relevant app store or checkout provider. If you need help and cannot resolve it through that provider, contact support.',
        ],
      },
      {
        heading: 'Digital content and availability',
        body: [
          'Some features depend on third-party services, network availability, app-store billing, payment providers, AI providers, news providers, location services and database hosting.',
          'We aim to keep the app available, but we do not guarantee uninterrupted access. Features may be changed, paused or removed where needed for security, maintenance, provider changes, legal compliance or release readiness.',
          'Where a paid feature cannot be delivered because of an app-side issue, contact support so we can investigate and help with restoration or next steps.',
        ],
      },
      {
        heading: 'User content',
        body: [
          'You keep ownership of content you add to the app, such as notes, tasks, budgets, documents you create, feedback and LifeNest messages.',
          'You give us permission to store, process and transmit that content only as needed to provide, secure, maintain and improve the app, handle support, and comply with law.',
          'Do not add content you do not have the right to use, or content that is unlawful, abusive, unsafe or harmful.',
        ],
      },
      {
        heading: 'Limitation of responsibility',
        body: [
          'The app is provided with reasonable care and skill, but it cannot guarantee that every suggestion, link, result, AI response, price, news item or third-party output is complete, current or suitable for your situation.',
          'Nothing in these terms limits rights that cannot legally be limited, including statutory consumer rights.',
        ],
      },
      {
        heading: 'Changes to these terms',
        body: [
          'We may update these terms when the app, providers, laws or business details change. If a material update is made, the app may ask you to review and accept the latest version before continuing.',
        ],
      },
    ],
  },
  privacy: {
    key: 'privacy',
    title: 'Privacy Policy',
    shortTitle: 'Privacy Policy',
    version: 'v1',
    updatedAt: '25 July 2026',
    route: '/legal/privacy',
    sections: [
      {
        heading: 'Who controls your data',
        body: [
          `${PROJECT_OWNER_NAME} is responsible for how personal data is handled in Productivity Mobile App. ${contactLine}`,
          'This policy explains what data the app collects, why it is used, who may process it, how long it is kept, and the rights you may have under UK data protection law.',
        ],
      },
      {
        heading: 'Data you provide or create',
        body: [
          'Account and profile data: email address, name, phone number, date of birth, address fields, postcode, living situation, job status, Universal Credit preference, legal acceptance status and subscription status.',
          'App content: budgets and transactions, task and checklist data, notes, education records, document activity, dashboard preferences, settings, feedback, LifeNest conversations, message reports and LifeNest token usage records.',
          'Purchase-related data: subscription status, product identifiers, entitlement status, token balance and purchase restoration status. Full card details are handled by the relevant payment provider and are not stored by the app.',
          'Technical data: device/platform information, app version, diagnostics, error logs, analytics events, ad delivery status and limited location or locale signals used for region-specific features.',
        ],
      },
      {
        heading: 'Why we use data',
        body: [
          'To create and secure accounts, keep users signed in, provide app features, sync data between devices, show region-aware content, process subscriptions and token balances, deliver AI chat, respond to support requests, prevent misuse, improve reliability and meet legal obligations.',
          "Where the app uses optional settings, feedback, analytics or ads, data is used only as needed for that feature and the app's operation.",
        ],
      },
      {
        heading: 'Lawful bases',
        body: [
          'Contract: to provide the app, account, paid features, purchases, support and requested services.',
          'Legitimate interests: to secure the app, diagnose faults, prevent abuse, improve reliability, keep records of purchases and respond to user requests.',
          'Consent: where required for optional permissions, certain analytics, marketing or ad-related choices.',
          'Legal obligation: where records must be kept or disclosed to comply with applicable law, regulator requests, tax, accounting, consumer or safety requirements.',
        ],
      },
      {
        heading: 'Third-party services',
        body: [
          'Supabase provides authentication, database, storage-related backend services and Edge Functions.',
          'RevenueCat, Apple App Store, Google Play and Stripe help manage subscriptions, purchases, entitlements and token balances.',
          'OpenAI is used through a server-side LifeNest AI function so private API credentials are not placed in the app.',
          'Google Mobile Ads, AdSense or related Google services may be used for ad delivery where ads are shown.',
          'Optional demo diagnostics may be recorded locally during development. Expo services may support builds, updates and app runtime features.',
          'Sky News RSS, Postcodes.io, Reed and RapidAPI/Zoopla-related providers may be used for news, postcode lookup, job or housing-related features where available.',
          'These providers process data only as needed for the relevant feature, payment, hosting, security, diagnostics or support workflow.',
        ],
      },
      {
        heading: 'Advertising and cookies',
        body: [
          'On public web pages where ads are shown, Google AdSense may use cookies, web beacons, IP addresses and similar identifiers to deliver, measure and prevent abuse in advertising. Google and its partners may place and read cookies on your browser as a result of ad serving.',
          'You can learn more about how Google uses data when you use partners sites and apps at https://policies.google.com/technologies/partner-sites. Where legally required, advertising and analytics choices are subject to the consent controls presented for your region. You can also manage cookies through your browser settings.',
          'Private account screens do not display the web AdSense unit. We do not pass account details, transaction data, grades, health information or LifeNest conversations to AdSense for ad targeting.',
        ],
      },
      {
        heading: 'International transfers',
        body: [
          'Some providers may process data outside the UK. Where this happens, we rely on appropriate safeguards provided by those services, such as contractual protections, transfer terms or adequacy arrangements where applicable.',
        ],
      },
      {
        heading: 'Retention',
        body: [
          'Account data is kept while the account is active. User-created app content is kept until the user deletes it or the account is deleted, unless a longer period is needed for legal, security, billing or dispute reasons.',
          'Purchase and entitlement records may be kept for as long as needed to provide access, restore purchases, resolve billing questions and meet tax/accounting requirements.',
          'Diagnostics and analytics are kept only as long as reasonably needed for reliability, security, support and improvement.',
        ],
      },
      {
        heading: 'Your rights',
        body: [
          'You may have rights to access, correct, erase, restrict, object to or receive a copy of your personal data, and to withdraw consent where processing is based on consent.',
          'You can manage some data directly in the app, including deleting your account. For other requests, contact support.',
          "If you are not satisfied with how your data request is handled, you may complain to the UK Information Commissioner's Office.",
        ],
      },
      {
        heading: 'Security',
        body: [
          'The app uses authenticated access, provider security controls, row-level access assumptions, server-side handling for private API credentials and diagnostic logging designed to avoid passwords and raw secrets.',
          'No online service can be guaranteed completely secure. If you believe your account or data is at risk, contact support promptly.',
        ],
      },
    ],
  },
  lifenest: {
    key: 'lifenest',
    title: 'LifeNest Terms',
    shortTitle: 'LifeNest Terms',
    version: 'v1',
    updatedAt: '25 July 2026',
    route: '/legal/lifenest',
    sections: [
      {
        heading: 'What LifeNest is',
        body: [
          'LifeNest is an AI-powered planning assistant inside Productivity Mobile App. It can help with organisation, budgeting habits, independent-living planning, checklists and general guidance.',
          'LifeNest is not a professional adviser and must not be used as a substitute for financial, legal, medical, mental-health, safeguarding, housing, benefits, tax or emergency advice.',
        ],
      },
      {
        heading: 'How AI responses should be used',
        body: [
          'AI responses may be incomplete, outdated or incorrect. Check important information before acting on it.',
          'Do not rely on LifeNest for urgent, emergency or high-risk decisions. Contact emergency services, a qualified professional or a trusted support organisation when appropriate.',
        ],
      },
      {
        heading: 'Messages and data',
        body: [
          'LifeNest messages, conversation records, model preferences, reports and usage records may be stored so the app can show chat history, enforce token usage, handle reports and improve reliability.',
          'LifeNest requests are sent through a server-side function to the AI provider. Do not enter passwords, payment card details, government identity numbers, medical records or highly sensitive information into chat.',
        ],
      },
      {
        heading: 'Tokens and access',
        body: [
          'LifeNest uses tokens to control access and usage. Premium subscriptions may include a monthly allowance while active. Extra token bundles may be purchased and used before or after a subscription period, subject to account and provider sync.',
          'Token balances may take time to update after purchase because payment and entitlement providers must confirm the transaction.',
        ],
      },
      {
        heading: 'Safety and moderation',
        body: [
          'Users can report assistant messages. Reports may include the message, reason and supporting details so issues can be reviewed.',
          'We may restrict or change LifeNest behaviour where needed for safety, abuse prevention, provider requirements or legal compliance.',
        ],
      },
      {
        heading: 'Availability',
        body: [
          'LifeNest depends on network access, backend services and AI providers. It may be unavailable during maintenance, provider outages, rate limits or configuration changes.',
          'If a paid LifeNest feature is unavailable for an extended period, contact support so we can investigate.',
        ],
      },
    ],
  },
};

export const REQUIRED_LEGAL_DOCUMENTS = [
  LEGAL_DOCUMENTS.terms,
  LEGAL_DOCUMENTS.privacy,
  LEGAL_DOCUMENTS.lifenest,
];
