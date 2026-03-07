// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

@class MBMStyleImageRemoveUnused;

/**
 * An image requested by the `map` through the `StyleImageMissing` event is no longer
 * needed and can be removed using the `removeStyleImage` method. The application can
 * decide whether the image should be kept or removed.
 *
 * @see StyleImageRemoveUnused
 */
NS_SWIFT_NAME(StyleImageRemoveUnusedCallback)
typedef void (^MBMStyleImageRemoveUnusedCallback)(MBMStyleImageRemoveUnused * _Nonnull styleImageRemoveUnused); // NOLINT(modernize-use-using)
