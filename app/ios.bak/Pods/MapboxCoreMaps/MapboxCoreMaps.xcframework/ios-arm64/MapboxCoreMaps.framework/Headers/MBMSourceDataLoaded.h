// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>
#import <MapboxCoreMaps/MBMSourceDataLoadedType.h>

@class MBMCanonicalTileID;
@class MBMEventTimeInterval;

/**
 * The `SourceDataLoaded` event is emitted when source data is loaded.
 *
 * Note: The event will be emitted synchronously in cases when the source's metadata is available when a source is added to the style.
 */
NS_SWIFT_NAME(SourceDataLoaded)
__attribute__((visibility ("default")))
@interface MBMSourceDataLoaded : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

- (nonnull instancetype)initWithSourceId:(nonnull NSString *)sourceId
                                    type:(MBMSourceDataLoadedType)type
                                  loaded:(nullable NSNumber *)loaded
                                  tileId:(nullable MBMCanonicalTileID *)tileId
                                  dataId:(nullable NSString *)dataId
                            timeInterval:(nonnull MBMEventTimeInterval *)timeInterval NS_REFINED_FOR_SWIFT;

/** The identifier of a source. */
@property (nonatomic, readonly, nonnull, copy) NSString *sourceId;

/** The type of a loaded data. */
@property (nonatomic, readonly) MBMSourceDataLoadedType type;

/**
 * When the `type` of an event is `SourceDataLoadedType.Tile`, the `loaded`
 * property will be set to `true` if all source data required for the visible
 * viewport of the `map` are loaded.
 *
 * Note: The property will be null for the `type` other than `SourceDataLoadedType.Tile`.
 */
@property (nonatomic, readonly, nullable) NSNumber *loaded NS_REFINED_FOR_SWIFT;

/**
 * When the `type` of an event is `SourceDataLoadedType.Tile` the `tileId`
 * property defines the tile coordinate.
 */
@property (nonatomic, readonly, nullable) MBMCanonicalTileID *tileId;

/**
 * When the `type` of an event is `SourceDataLoadedType.Metadata` and the
 * data identifier was provided to the `setStyleGeoJSONSourceData` method,
 * this property can be used to determine what data was loaded by the `GeoJSON` source.
 */
@property (nonatomic, readonly, nullable, copy) NSString *dataId;

/** The `timeInterval.begin` is when source data begins loading, and the `timeInterval.end` is when source data is loaded. */
@property (nonatomic, readonly, nonnull) MBMEventTimeInterval *timeInterval;


@end
