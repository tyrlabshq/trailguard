// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>

/** Defines how the map center point should react to terrain elevation changes. */
// NOLINTNEXTLINE(modernize-use-using)
typedef NS_ENUM(NSInteger, MBMMapCenterAltitudeMode)
{
    /** Default, center altitude should match the terrain elevation */
    MBMMapCenterAltitudeModeTerrain,
    /** Center altitude should disregard the underlying terrain elevation */
    MBMMapCenterAltitudeModeSea
} NS_SWIFT_NAME(MapCenterAltitudeMode);
