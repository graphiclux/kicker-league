const { withAndroidManifest, withDangerousMod } = require('expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');

module.exports = function withUsbPreview(config, { host = '127.0.0.1' } = {}) {
  if (!/^[a-zA-Z0-9.-]+$/.test(host)) throw new Error('Invalid preview host');
  config = withAndroidManifest(config, (mod) => {
    const app = mod.modResults.manifest.application[0];
    app.$['android:networkSecurityConfig'] = '@xml/aing_network_security';
    return mod;
  });
  return withDangerousMod(config, ['android', async (mod) => {
    const dir = path.join(mod.modRequest.platformProjectRoot, 'app/src/main/res/xml');
    fs.mkdirSync(dir, { recursive: true });
    // Cleartext is restricted to the explicitly selected local preview host.
    fs.writeFileSync(path.join(dir, 'aing_network_security.xml'), `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="false" />
  <domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="false">${host}</domain>
  </domain-config>
</network-security-config>
`);
    return mod;
  }]);
};
