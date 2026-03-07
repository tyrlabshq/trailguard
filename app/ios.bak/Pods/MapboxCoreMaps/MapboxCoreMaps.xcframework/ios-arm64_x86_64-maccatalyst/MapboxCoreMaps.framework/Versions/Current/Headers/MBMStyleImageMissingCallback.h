// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

@class MBMStyleImageMissing;

/**
 * A style needs an image that is missing from the sprite sheet. This event is
 * emitted when the `map` renders visible tiles, and one of the required images
 * is missing in the sprite sheet. The event observer has to provide the missing
 * image by calling the `addStyleImage` method.
 *
 * @see StyleImageMissing
 */
NS_SWIFT_NAME(StyleImageMissingCallback)
typedef void (^MBMStyleImageMissingCallback)(MBMStyleImageMissing * _Nonnull styleImageMissing); // NOLINT(modernize-use-using)
