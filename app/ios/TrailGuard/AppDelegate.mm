#import "AppDelegate.h"

#import <React/RCTBundleURLProvider.h>
// RCTPushNotificationManager bridges the APNs device token to the JS-side
// PushNotificationIOS.addEventListener('register', ...) listener in
// DeviceTokenService.ts so we can upsert the token to Supabase.
#import <React/RCTPushNotificationManager.h>
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

  // ── APNs Remote Push Registration ─────────────────────────────────────────
  // Request an APNs device token so the sos-push edge function can deliver
  // remote push notifications when the app is killed.
  //
  // This call does NOT prompt the user for permission — notification permission
  // is handled separately by notifee (DeviceTokenService.ts / SOSNotificationService.ts).
  // It simply asks APNs for a token; the token is delivered asynchronously via
  // didRegisterForRemoteNotificationsWithDeviceToken below.
  //
  // iOS silently skips registration if the user has denied notification
  // permission; no error occurs in that case.
  [application registerForRemoteNotifications];

  return [super application:application didFinishLaunchingWithOptions:launchOptions];
}

// ── APNs token delivery ────────────────────────────────────────────────────

/**
 * Called by iOS when APNs successfully issues a device token.
 * Forwards the token to RCTPushNotificationManager, which fires the
 * PushNotificationIOS 'register' event in JS (DeviceTokenService.ts).
 */
- (void)application:(UIApplication *)application
    didRegisterForRemoteNotificationsWithDeviceToken:(NSData *)deviceToken
{
  [RCTPushNotificationManager didRegisterForRemoteNotificationsWithDeviceToken:deviceToken];
}

/**
 * Called when APNs token registration fails (e.g. no network, simulator).
 * Forwarded to RCTPushNotificationManager so the JS 'registrationError'
 * event fires in DeviceTokenService.ts.
 */
- (void)application:(UIApplication *)application
    didFailToRegisterForRemoteNotificationsWithError:(NSError *)error
{
  [RCTPushNotificationManager didFailToRegisterForRemoteNotificationsWithError:error];
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
