Pod::Spec.new do |s|
  s.name         = "FitTrackCrashFix"
  s.version      = "1.0.0"
  s.summary      = "iOS 26 ObjCTurboModule crash fix for FitTrack"
  s.description  = "Swizzles RCTExceptionsManager.reportFatal to prevent the iOS 26 " \
                   "objc_exception_rethrow → __cxa_rethrow → terminate() crash chain."
  s.homepage     = "https://github.com/zero00cc/fittrack-ios"
  s.license      = { :type => "MIT" }
  s.author       = "FitTrack"
  s.platform     = :ios, "16.4"
  s.source       = { :path => "." }
  s.source_files = "*.m"
  s.requires_arc = true
  s.frameworks   = "Foundation", "UIKit"
end
