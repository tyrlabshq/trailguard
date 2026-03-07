// This file is generated and will be overwritten automatically.

#import <Foundation/Foundation.h>
#import <MapboxCommon/MBXTileStoreImportErrorType.h>

/** Describes a tile store import operation error. */
NS_SWIFT_NAME(TileStoreImportError)
__attribute__((visibility ("default")))
@interface MBXTileStoreImportError : NSObject

// This class provides custom init which should be called
- (nonnull instancetype)init NS_UNAVAILABLE;

// This class provides custom init which should be called
+ (nonnull instancetype)new NS_UNAVAILABLE;

- (nonnull instancetype)initWithType:(MBXTileStoreImportErrorType)type
                             message:(nonnull NSString *)message;

/** The reason for the response error. */
@property (nonatomic, readonly) MBXTileStoreImportErrorType type;

/** An error message */
@property (nonatomic, readonly, nonnull, copy) NSString *message;


@end
