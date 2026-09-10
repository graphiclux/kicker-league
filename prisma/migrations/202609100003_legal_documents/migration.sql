CREATE TABLE "LegalDocument" (
  "key" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LegalDocument_pkey" PRIMARY KEY ("key")
);

INSERT INTO "LegalDocument" ("key", "title", "content", "updatedAt") VALUES
('privacy', 'Privacy Policy', $$# Privacy Policy

Last updated: September 10, 2026

And It’s No Good (“AING”, “we”, “us”, or “our”) operates a fantasy football game focused on NFL kicking positions. This Privacy Policy explains what information we collect, why we use it, and the choices available to you when you use the AING website, mobile application, APIs, and related services (the “Service”).

## Information we collect

We collect information you provide when you create and use an account, including your email address, display name, password (stored as a one-way hash rather than in plain text), team name, league memberships, draft choices, and messages or support requests you send us.

The Service creates records about your activity, including sign-in sessions, draft picks, roster assignments, scoring views, notifications, preference changes, and security events. Super Admin actions and important scoring or data corrections are recorded in an audit log so league results can be explained and protected from tampering.

If you use the mobile application and enable push notifications, we store the device push token needed to deliver those notifications. We may receive basic technical information such as IP address, browser or device type, request timestamps, and error or security logs. We use this information for authentication, rate limiting, fraud prevention, troubleshooting, and service reliability.

NFL team, kicker, schedule, availability, and kicking-event information is imported from public or licensed sports-data providers and is not information you submit about yourself. Provider records may include kicker names, headshots, field-goal distance, made or missed results, and the source and time of the update.

## How we use information

We use information to create and secure accounts; operate leagues, drafts, rosters, standings, and scoring; inherit backup kickers by NFL franchise; send account, league, draft, scoring, and security emails or push notifications you have enabled; respond to support requests; investigate abuse; maintain audit history; comply with law; and improve the Service.

We do not sell personal information. We do not use fantasy activity to make decisions about credit, employment, housing, insurance, or other similarly significant matters.

## Service providers and sharing

We share only the information needed to operate the Service with infrastructure and delivery providers acting on our instructions. These may include PostgreSQL and Redis hosting, application hosting, Cloudflare networking, Postmark for transactional email, and Expo or an equivalent push-notification service when push notifications are enabled. Providers may process information in the countries where they operate and must protect it under their own terms and applicable law.

We may disclose information when required by law, to protect users or the Service, to investigate security incidents, or as part of a merger, acquisition, financing, or sale of assets. League members can see the display names, team names, rosters, picks, standings, and scoring activity that the Service makes available within their league. Your password and private session tokens are never shown to other users.

## Retention and deletion

We keep account and league information while your account is active and as needed to operate seasons, resolve disputes, maintain audit history, meet legal obligations, and prevent abuse. You may request account deletion by contacting us at privacy@hostsites.me. Deletion removes or anonymizes account credentials and personal profile details and revokes sessions and devices. League results, draft history, scoring events, and audit records may remain in a minimized form because removing them would make league records inaccurate or allow manipulation.

## Your choices and rights

You may update your display name, fantasy team name, notification preferences, and email preferences in the Service. You may unsubscribe from non-essential email notifications using the preference controls in the application. Account, verification, password-reset, and security messages are necessary to provide a secure account and may still be sent. Depending on where you live, you may have rights to access, correct, delete, restrict, or export personal information and to object to certain processing. Contact us to exercise those rights; we may verify your identity before completing a request.

## Security

We use access controls, encrypted transport, hashed passwords, short-lived access sessions, refresh-token rotation, rate limiting, and audit logs. No online service can guarantee absolute security. Tell us promptly about suspected unauthorized access.

## Children

The Service is intended for adults and is not directed to children under 13. We do not knowingly collect personal information from children under 13. Contact us if you believe a child has submitted information.

## Changes and contact

We may update this Policy when the Service or legal requirements change. We will publish the new version here and update the date above. Questions or privacy requests can be sent to privacy@hostsites.me.
$$, CURRENT_TIMESTAMP),
('terms', 'Terms of Service', $$# Terms of Service

Last updated: September 10, 2026

These Terms of Service (“Terms”) govern your use of the And It’s No Good website, mobile application, APIs, and related services (the “Service”). By creating an account or using the Service, you agree to these Terms. If you do not agree, do not use the Service.

## The game

And It’s No Good is a fantasy football game about NFL kicking positions. A league may contain 2 to 32 teams. Each fantasy roster has one NFL kicking position. A league uses one draft round: after the draft, a team keeps the selected NFL franchise’s kicking position for the season, including backup kickers who inherit that position when the franchise changes kickers. The Service does not provide trades, waivers, lineup changes, or post-draft roster control unless we explicitly announce a product change.

Scoring is calculated by the global scoring rules configured for the season. NFL data may be corrected, imported again, or adjusted by a Super Admin when an official result or provider record is wrong. Audit logs preserve the reason and history of important corrections. Past scores are informational fantasy results and are not an official NFL record.

## Accounts

You must provide accurate information, keep your password and devices secure, and promptly tell us if you suspect unauthorized access. You are responsible for activity under your account. One person may not create accounts to manipulate a draft, standings, scoring, invitations, or notifications. We may suspend or terminate accounts that violate these Terms or threaten the Service.

## League conduct

Commissioners are responsible for inviting participants and choosing league settings within the available limits. Users must not impersonate another person, interfere with a draft, exploit a bug, scrape or overload the Service, submit malicious content, or attempt to access another account or league. We may correct, pause, or reset a draft or score when reasonably necessary to preserve a fair and reliable league.

## Content and feedback

You retain ownership of team names, display names, and other text you submit. You grant us a limited license to store, display, and process that content only to operate, secure, and improve the Service. Do not submit unlawful, abusive, infringing, or confidential information that the Service does not need.

## Availability and third-party data

The Service depends on networks, hosting systems, mobile platforms, and sports-data providers. We work to keep it available, but we do not promise uninterrupted access or a particular update time. Provider data can be delayed or incorrect; we provide correction and Super Admin tools to address it. Third-party services, links, app stores, and NFL marks are governed by their own terms.

## No prizes or wagering

Unless we publish separate written rules, the Service is for entertainment and does not offer cash prizes, paid contests, wagering, or an entry fee. Do not use it for gambling or as a substitute for official sports information.

## Intellectual property

The Service, its software, design, branding, and original content belong to us or our licensors. These Terms grant you a limited, revocable, non-exclusive right to use the Service for personal, lawful entertainment. You may not copy, resell, modify, reverse engineer, or create a competing service from it except where applicable law gives you a non-waivable right.

## Disclaimers and limits

The Service is provided on an “as available” basis. To the extent permitted by law, we disclaim implied warranties and are not responsible for indirect, incidental, special, consequential, or punitive losses, or for decisions made from scores, player status, or provider data. Nothing in these Terms limits rights or remedies that applicable law does not allow us to limit.

## Changes, termination, and contact

We may change the Service or these Terms as it evolves. We will publish updated Terms here and change the date above. Continued use after an update means you accept the revised Terms. You may stop using the Service at any time. We may suspend or terminate access for security, legal, or operational reasons. Contact us at privacy@hostsites.me with questions about these Terms.
$$, CURRENT_TIMESTAMP);
