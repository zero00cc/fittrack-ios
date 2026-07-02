#import <Foundation/Foundation.h>
#import <UIKit/UIKit.h>
#import <objc/runtime.h>

// iOS 26 crash fix
//
// On iOS 26, objc_exception_rethrow() inside an @finally block calls __cxa_rethrow,
// which calls std::terminate() even after the exception was already consumed in @catch.
//
// React Native's ObjCTurboModule::performVoidMethodInvocation wraps every async
// native method call in @try/@catch/@finally and unconditionally calls
// objc_exception_rethrow() in @finally. When a fatal JS error occurs, the JS engine
// calls RCTExceptionsManager.reportException -> reportFatal:... -> RCTFatal -> @throw,
// which triggers this iOS 26 bug and kills the process.
//
// Fix: replace reportFatal:stack:exceptionId:extraDataAsJSON: with an implementation
// that logs the error without throwing, breaking the crash chain at the source.
// A native UIAlertController is shown so the fatal error message is visible for debugging.

static void fittrack_suppressedFatal(id self, SEL _cmd,
                                     NSString *message,
                                     NSArray *stack,
                                     double exceptionId,
                                     NSString *extraDataAsJSON) {
  NSLog(@"[FitTrack] Suppressed RCTFatal (iOS 26 crash fix) — fatal JS error: %@", message);
  NSLog(@"[FitTrack] extraData: %@", extraDataAsJSON);

  // Show a native alert so we can read the actual JS error without a crash report
  dispatch_after(dispatch_time(DISPATCH_TIME_NOW, (int64_t)(0.6 * NSEC_PER_SEC)),
                 dispatch_get_main_queue(), ^{
    UIWindow *window = nil;
    for (UIScene *scene in [UIApplication sharedApplication].connectedScenes) {
      if ([scene isKindOfClass:[UIWindowScene class]]) {
        UIWindowScene *ws = (UIWindowScene *)scene;
        if (ws.activationState == UISceneActivationStateForegroundActive) {
          window = ws.windows.firstObject;
          break;
        }
      }
    }

    UIViewController *root = window.rootViewController;
    while (root.presentedViewController) {
      root = root.presentedViewController;
    }

    if (root) {
      NSString *display = message ?: @"Unknown error";
      UIAlertController *alert = [UIAlertController
        alertControllerWithTitle:@"Startup Error (debug)"
        message:display
        preferredStyle:UIAlertControllerStyleAlert];
      [alert addAction:[UIAlertAction actionWithTitle:@"OK"
                                               style:UIAlertActionStyleDefault
                                             handler:nil]];
      [root presentViewController:alert animated:YES completion:nil];
    }
  });
}

@interface FitTrackIOS26Fix : NSObject
@end

@implementation FitTrackIOS26Fix

+ (void)load {
  // +load runs at class-load time, before main() and before any JS code.
  Class cls = objc_getClass("RCTExceptionsManager");
  if (!cls) {
    NSLog(@"[FitTrack] iOS 26 fix: RCTExceptionsManager not found — skipping");
    return;
  }
  SEL sel = NSSelectorFromString(@"reportFatal:stack:exceptionId:extraDataAsJSON:");
  Method method = class_getInstanceMethod(cls, sel);
  if (method) {
    method_setImplementation(method, (IMP)fittrack_suppressedFatal);
    NSLog(@"[FitTrack] iOS 26 crash fix installed on RCTExceptionsManager.reportFatal");
  } else {
    NSLog(@"[FitTrack] iOS 26 fix: reportFatal:... selector not found — skipping");
  }
}

@end
