#import <Foundation/Foundation.h>

@protocol MBMMetalView;
@protocol MTLDevice;
@protocol MTLTexture;
@protocol CAMetalDrawable;

NS_ASSUME_NONNULL_BEGIN

/**
 * Interface for providing MBMMetalView to the map renderer.
 */
@protocol MBMMetalViewProvider

@optional

- (id<MBMMetalView> _Nullable)getMetalViewFor:(nullable id<MTLDevice>)metalDevice;

- (nullable id<MTLTexture>)getDrawableTexture;

/// Deprecated, implementing this method has no effect
- (CFTimeInterval)getTargetFrameTimestamp;

@end

/**
 * Interface that represents a Metal view. The implementation can use MTKView, or any View built on top of CAMetalLayer.
 */
@protocol MBMMetalView

@property(nonatomic, assign) BOOL presentsWithTransaction;
@property(nonatomic, assign, readonly) CGSize drawableSize;
@property(nonatomic, assign, readonly) NSInteger sampleCount;
@property(nonatomic, readonly, nullable) id<MTLTexture> multisampleColorTexture;

@property (nonatomic, copy, nullable) void (^onRender)();

- (nullable id<CAMetalDrawable>)nextDrawable;

@end

NS_ASSUME_NONNULL_END
