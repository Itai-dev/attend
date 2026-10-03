/**
 * One config, two apps (the same pattern as Pattern):
 * APP_VARIANT=development builds "Attend Dev" with its own bundle id, so a
 * development build sits beside the real app instead of replacing it.
 */
const { expo } = require('./app.json');

const IS_DEV = process.env.APP_VARIANT === 'development';

module.exports = {
  expo: {
    ...expo,
    name: IS_DEV ? 'Attend Dev' : expo.name,
    scheme: IS_DEV ? 'attenddev' : expo.scheme,
    ios: {
      ...expo.ios,
      bundleIdentifier: IS_DEV ? `${expo.ios.bundleIdentifier}.dev` : expo.ios.bundleIdentifier,
    },
    android: {
      ...expo.android,
      package: IS_DEV ? `${expo.android.package}.dev` : expo.android.package,
    },
  },
};
