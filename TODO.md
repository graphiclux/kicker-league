# Production release priorities

- Deploy an OVH staging environment with a public HTTPS domain and production-like secrets. Point a separately signed production mobile build at that API and test away from the development Mac.
- Harden mobile session recovery: a temporary network error currently clears the stored refresh token on launch. Add explicit connection/retry states, background/resume recovery and draft reconnection tests.
- Add an account deletion workflow, published privacy policy, support contact, and complete Google Play Data safety disclosures before store submission.
- Add CI for the existing unit, integration and browser checks, plus Android build/device smoke tests. Exercise concurrent drafting with 32 teams, duplicate/corrected scoring imports and worker recovery.

- Configure a real NFL data provider URL and validate its field/extra-point semantics before enabling live sync.
- Configure production SMTP, Expo/APNs/FCM credentials, DNS, OVH firewall rules, off-host encrypted backups, monitoring, and secrets.
- Perform the first real OVH deployment and certificate issuance.
- Complete production Apple/Google signing, physical-device push delivery, and mobile store review. A signed Android preview has been installed and tested locally; that is separate from a store release.

The local application is runnable, but production readiness still requires both engineering work and external validation. Credentials and signing secrets must stay outside the repository.
