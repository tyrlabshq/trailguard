// This file is generated and will be overwritten automatically.

#import <MapboxCoreMaps/MBMStylePack.h>

@interface MBMStylePack ()
- (nonnull instancetype)initWithStyleURI:(nonnull NSString *)styleURI
                 glyphsRasterizationMode:(MBMGlyphsRasterizationMode)glyphsRasterizationMode
                   requiredResourceCount:(uint64_t)requiredResourceCount
                  completedResourceCount:(uint64_t)completedResourceCount
                   completedResourceSize:(uint64_t)completedResourceSize
                                 expires:(nullable NSDate *)expires
                               extraData:(nullable id)extraData;
@property (nonatomic, readonly, nullable, copy) id extraData;
@end
