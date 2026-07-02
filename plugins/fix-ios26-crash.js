const { withDangerousMod } = require('@expo/config-plugins');
const path = require('path');
const fs = require('fs');

// Expo config plugin — adds a local CocoaPod that swizzles
// RCTExceptionsManager.reportFatal:stack:exceptionId:extraDataAsJSON:
// to prevent the iOS 26 ObjCTurboModule rethrow crash.
//
// The pod is compiled into the app binary. Its +load method runs before main()
// and before any JS, so the swizzle is in place when the first fatal JS error fires.

module.exports = function withIos26CrashFix(config) {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let podfile = fs.readFileSync(podfilePath, 'utf8');

      const podLine = "  pod 'FitTrackCrashFix', :path => '../ios-fix'";

      if (!podfile.includes('FitTrackCrashFix')) {
        // Insert immediately after use_expo_modules! so it is inside the target block
        podfile = podfile.replace(
          /(\s*use_expo_modules!\s*\n)/,
          `$1${podLine}\n`
        );
        fs.writeFileSync(podfilePath, podfile, 'utf8');
      }

      return config;
    },
  ]);
};
