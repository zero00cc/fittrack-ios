import { ErrorUtils, Alert } from 'react-native';

// iOS 26 crash workaround:
// When a fatal JS error occurs, RN calls RCTExceptionsManager.reportFatalException
// (native) → RCTFatal → NSException → ObjCTurboModule @catch/@finally →
// objc_exception_rethrow → __cxa_rethrow → std::terminate() on iOS 26.
// We intercept here so the native throw never happens.
const _prevHandler = ErrorUtils.getGlobalHandler();
ErrorUtils.setGlobalHandler((error, isFatal) => {
  console.error('[FitTrack] JS error (isFatal=' + isFatal + '):', error?.message, error?.stack);
  if (isFatal) {
    // Show the real error so we can diagnose what's failing at startup
    setTimeout(() => {
      Alert.alert(
        'Startup Error (debug)',
        error?.message + '\n\n' + (error?.stack || '').split('\n').slice(0, 6).join('\n'),
        [{ text: 'OK' }],
      );
    }, 500);
    // Do NOT call _prevHandler — leads to ObjCTurboModule rethrow crash on iOS 26
    return;
  }
  _prevHandler(error, isFatal);
});

require('expo-router/entry');
