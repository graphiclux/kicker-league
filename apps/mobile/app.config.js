module.exports = ({ config }) => {
  const profile = process.env.AING_MOBILE_PROFILE;
  if (!['usb', 'wifi'].includes(profile)) return config;
  const host = profile === 'wifi' ? process.env.AING_WIFI_HOST : '127.0.0.1';
  if (!host || !/^[a-zA-Z0-9.-]+$/.test(host)) {
    throw new Error('Set AING_WIFI_HOST to the Mac LAN IP address or hostname.');
  }
  return {
    ...config,
    name: `And It's No Good · ${profile === 'wifi' ? 'Wi-Fi' : 'USB'}`,
    android: {
      ...config.android,
      package: 'com.anditsnogood.preview',
      versionCode: profile === 'wifi' ? 2 : 1,
    },
    plugins: [...(config.plugins || []), ['./plugins/with-usb-preview', { host }]],
  };
};
