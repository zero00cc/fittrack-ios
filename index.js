import { Alert } from 'react-native';

// global.ErrorUtils is set by the RN runtime before any user code runs.
// It is NOT a named export from the 'react-native' package in RN 0.86.
// Guard every access so a missing or undefined ErrorUtils never throws here
// and blocks require('expo-router/entry') from running.
const _eu = global.ErrorUtils;
if (_eu) {
  const _prev = _eu.getGlobalHandler();
  _eu.setGlobalHandler((error, isFatal) => {
    console.error('[FitTrack] JS error (fatal=' + isFatal + '):', error?.message, error?.stack);
    if (isFatal) {
      // Show a visible alert so we can read the real startup error on-device
      setTimeout(() => {
        Alert.alert(
          'Startup Error',
          (error?.message || 'Unknown') + '\n\n' +
            (error?.stack || '').split('\n').slice(0, 6).join('\n'),
          [{ text: 'OK' }],
        );
      }, 500);
      // Do NOT call _prev — that path invokes RCTExceptionsManager.reportFatalException
      // → RCTFatal → NSException → ObjCTurboModule rethrow → terminate() on iOS 26
      return;
    }
    _prev(error, isFatal);
  });
}

// This must always run regardless of whether ErrorUtils was available above
require('expo-router/entry');
