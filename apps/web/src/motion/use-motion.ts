import { useGSAP } from '@gsap/react';
import gsap from 'gsap';
import type { RefObject } from 'react';
import type { MotionSettings } from '@task-board/contracts';
gsap.registerPlugin(useGSAP);
export const useMotion = (scope: RefObject<HTMLElement | null>, settings: MotionSettings, selector?: string) => {
  useGSAP(() => {
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      if (!settings.enabled || !scope.current) return;
      const elements = selector ? scope.current.querySelectorAll(selector) : scope.current;
      gsap.fromTo(elements, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: settings.durationMs / 1000,
        stagger: { each: settings.staggerMs / 1000, amount: selector ? Math.min(settings.staggerMs / 1000 * 3, 0.3) : 0 },
        ease: settings.easing, clearProps: 'opacity,transform' });
    });
    return () => media.revert();
  }, { scope, dependencies: [settings.enabled, settings.durationMs, settings.staggerMs, settings.easing, selector], revertOnUpdate: true });
};
