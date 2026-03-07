#import "AppDelegate.h"

#import <React/RCTBundleURLProvider.h>
#import <CoreLocation/CoreLocation.h>
#import <MultipeerConnectivity/MultipeerConnectivity.h>
#import <BackgroundTasks/BackgroundTasks.h>
#import "TrailGuard-Swift.h"

@implementation AppDelegate

- (BOOL)application:(UIApplication *)application didFinishLaunchingWithOptions:(NSDictionary *)launchOptions
{
  self.moduleName = @"TrailGuard";
  // You can add your custom initial props in the dictionary below.
  // They will be passed down to the ViewController used by React Native.
  self.initialProps = @{};

  // Register Dead Man's Switch background task identifier.
  // Must be called before the app finishes launching (BGTaskScheduler requirement).
  [DeadMansSwitchManager.shared registerBackgroundTasks];

  return [super application:application didFinishLaunchingWithOptions:launchOptions];
}

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
  return [self getBundleURL];
}

- (NSURL *)getBundleURL
{
#if DEBUG
  return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"];
#else
  return [[NSBundle mainBundle] URLForResource:@"main" withExtension:@"jsbundle"];
#endif
}

@end
