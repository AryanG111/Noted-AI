import React, { useEffect, useRef } from 'react';
import lottie from 'lottie-web';

/**
 * Bulletproof Lottie Animation Component.
 * Bypasses buggy React wrapper layers and directly uses lottie-web.
 * Deep-clones animation data to prevent in-place mutation and freeze bugs.
 */
export const LottieAnimation = ({ 
  animationData, 
  src, 
  loop = true, 
  autoplay = true, 
  style = {}, 
  className = '' 
}) => {
  const containerRef = useRef(null);
  const animInstanceRef = useRef(null);

  useEffect(() => {
    const rawData = animationData || src;
    if (!rawData || !containerRef.current) return;

    // Deep clone to ensure lottie-web's in-place mutations don't corrupt the source JSON
    let safeData;
    try {
      const dataToClone = rawData.default || rawData;
      safeData = typeof dataToClone === 'string' ? dataToClone : JSON.parse(JSON.stringify(dataToClone));
    } catch (err) {
      console.warn('LottieAnimation: Failed to clone animation data', err);
      safeData = rawData.default || rawData;
    }

    try {
      // Destroy any prior instance on this container
      if (animInstanceRef.current) {
        animInstanceRef.current.destroy();
        animInstanceRef.current = null;
      }

      const params = {
        container: containerRef.current,
        renderer: 'svg',
        loop: loop,
        autoplay: autoplay,
      };

      if (typeof safeData === 'string') {
        params.path = safeData;
      } else {
        params.animationData = safeData;
      }

      const anim = lottie.loadAnimation(params);
      animInstanceRef.current = anim;

      // Ensure autoplay starts reliably
      if (autoplay) {
        anim.play();
      }

      return () => {
        try {
          anim.destroy();
        } catch (e) {
          // ignore cleanup errors
        }
        animInstanceRef.current = null;
      };
    } catch (error) {
      console.error('LottieAnimation: Error initializing animation', error);
    }
  }, [animationData, src, loop, autoplay]);

  return (
    <div 
      ref={containerRef} 
      className={`lottie-container ${className}`} 
      style={{ 
        width: '100%', 
        height: '100%', 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        ...style 
      }} 
    />
  );
};

export default LottieAnimation;
