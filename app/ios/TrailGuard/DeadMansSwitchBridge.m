//
//  DeadMansSwitchBridge.m
//  TrailGuard — TG-02
//
//  React Native native module: bridges DeadMansSwitchManager (Swift) to JS.
//  Extends RCTEventEmitter so JS can subscribe to DMS events:
//    • onDMSAlert         — alert fired (check-in modal should appear)
//    • onDMSEscalated     — escalation auto-triggered (2 min, no response)
//    • onDMSStateChange   — running/stopped/interval changed
//

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
#import "TrailGuard-Swift.h"

@interface RCTDeadMansSwitchModule : RCTEventEmitter <RCTBridgeModule, DeadMansSwitchManagerDelegate>
@end

@implementation RCTDeadMansSwitchModule

RCT_EXPORT_MODULE(DeadMansSwitchModule);

+ (BOOL)requiresMainQueueSetup { return NO; }

- (NSArray<NSString *> *)supportedEvents {
    return @[
        @"onDMSAlert",
        @"onDMSEscalated",
        @"onDMSStateChange",
    ];
}

// ── Lifecycle ──────────────────────────────────────────────────────────────

- (instancetype)init {
    self = [super init];
    if (self) {
        DeadMansSwitchManager.shared.delegate = self;
    }
    return self;
}

// ── Start / Stop ───────────────────────────────────────────────────────────

RCT_EXPORT_METHOD(start:(nonnull NSNumber *)intervalMinutes) {
    [DeadMansSwitchManager.shared startWithIntervalMinutes:[intervalMinutes intValue]];
}

RCT_EXPORT_METHOD(stop) {
    [DeadMansSwitchManager.shared stop];
}

// ── User actions ───────────────────────────────────────────────────────────

RCT_EXPORT_METHOD(checkIn) {
    [DeadMansSwitchManager.shared checkIn];
}

RCT_EXPORT_METHOD(snooze:(nonnull NSNumber *)minutes) {
    [DeadMansSwitchManager.shared snoozeWithMinutes:[minutes intValue]];
}

RCT_EXPORT_METHOD(updateInterval:(nonnull NSNumber *)minutes) {
    [DeadMansSwitchManager.shared updateIntervalWithMinutes:[minutes intValue]];
}

RCT_EXPORT_METHOD(triggerImmediately) {
    [DeadMansSwitchManager.shared triggerImmediately];
}

// ── Location injection ─────────────────────────────────────────────────────

RCT_EXPORT_METHOD(updateLocation:(double)lat lng:(double)lng) {
    [DeadMansSwitchManager.shared updateLocationWithLat:lat lng:lng];
}

// ── Status query ───────────────────────────────────────────────────────────

RCT_EXPORT_METHOD(getStatus:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    resolve([DeadMansSwitchManager.shared statusDict]);
}

// ── DeadMansSwitchManagerDelegate ─────────────────────────────────────────

- (void)dmsManagerDidFireAlert:(DeadMansSwitchManager *)manager {
    [self sendEventWithName:@"onDMSAlert" body:[manager statusDict]];
}

- (void)dmsManagerDidEscalate:(DeadMansSwitchManager *)manager
                           lat:(double)lat
                           lng:(double)lng
                   hasLocation:(BOOL)hasLocation {
    [self sendEventWithName:@"onDMSEscalated" body:@{
        @"lat":         @(lat),
        @"lng":         @(lng),
        @"hasLocation": @(hasLocation),
    }];
}

- (void)dmsManager:(DeadMansSwitchManager *)manager
    didChangeState:(NSDictionary<NSString *, id> *)info {
    [self sendEventWithName:@"onDMSStateChange" body:info];
}

@end
