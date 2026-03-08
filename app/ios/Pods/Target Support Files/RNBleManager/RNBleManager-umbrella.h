#ifdef __OBJC__
#import <UIKit/UIKit.h>
#else
#ifndef FOUNDATION_EXPORT
#if defined(__cplusplus)
#define FOUNDATION_EXPORT extern "C"
#else
#define FOUNDATION_EXPORT extern
#endif
#endif
#endif

#import "BleManager-Bridging-Header.h"
#import "BleManager.h"
#import "RNBleManager.h"

FOUNDATION_EXPORT double RNBleManagerVersionNumber;
FOUNDATION_EXPORT const unsigned char RNBleManagerVersionString[];

