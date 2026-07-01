import { ErrorUtils } from 'react-native';

// iOS 26 crash workaround:
// When a fatal JS error occurs, RN calls RCTExceptionsManager.reportFatalException
// (native), which calls RCTFatal, which throws an NSException. That exception
// propagates through ObjCTurboModule::performVoidMethodInvocation's @catch/@finally,
// and iOS 26 changed objc_exception_rethrow to call __cxa_rethrow, which calls
// std::terminate() instead of propagating the exception — crashing the app.
//
// By intercepting the fatal error here on the JS side, we prevent the native
// reportFatalException call entirely, so the NSException is never thrown and
// the crash chain never starts.
const _prevHandler = ErrorUtils.getGlobalHandler();
ErrorUtils.setGlobalHandler((error, isFatal) => {
  if (isFatal) {
    // Log so Xcode / device console shows the real underlying error
    console.error(
      '[FitTrack] Fatal JS error intercepted (iOS 26 crash prevention):',
      error?.message,
      error?.stack,
    );
    // Do NOT call _prevHandler — that invokes RCTExceptionsManager.reportFatalException
    // which leads to the ObjCTurboModule rethrow crash on iOS 26.
    return;
  }
  _prevHandler(error, isFatal);
});

require('expo-router/entry');
