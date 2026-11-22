import { useEffect, useRef, useState } from 'react';
import { Effects } from '@vivekkrishna30/atmosfx';

/** Fires once when the element scrolls into view. Used for section reveals. */
export function useReveal({ threshold = 0.15, rootMargin = '0px 0px -40px 0px' } = {}) {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    if (typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return undefined;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            observer.disconnect();
          }
        }
      },
      { threshold, rootMargin },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return { ref, shown };
}

/** Animate an integer from 0 to `target`. Respects prefers-reduced-motion. */
export function useCountUp(target, { duration = 900 } = {}) {
  const value = Number(target) || 0;
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduce || value === 0) {
      setDisplay(value);
      return undefined;
    }

    let raf;
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3;
      setDisplay(Math.round(eased * value));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return display;
}

/**
 * Ambient effect inside the referenced element, behind its content. Pass `effect` for a fixed
 * one ('cherry-blossom', 'snow', ...); without it the season picks (autumn leaves in November).
 * The library honors prefers-reduced-motion and pauses in background tabs on its own.
 */
export function useAtmosphere({ effect, ...options } = {}) {
  const ref = useRef(null);
  useEffect(() => {
    if (!ref.current) return undefined;
    const opts = { intensity: 0.3, zIndex: 0, ...options };
    const fx = effect ? Effects.mount(ref.current, effect, opts) : Effects.auto(ref.current, opts);
    return () => fx.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return ref;
}

/** A short confetti burst over the page, faded out and cleaned up after `ms`. */
export function celebrate(ms = 3500) {
  if (typeof document === 'undefined') return;
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  // Our own wrapper so the whole layer can fade out smoothly before it is destroyed.
  const layer = document.createElement('div');
  layer.setAttribute('aria-hidden', 'true');
  layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:60;transition:opacity .8s ease-out';
  document.body.append(layer);
  const fx = Effects.mount(layer, 'confetti', { intensity: 0.8 });
  setTimeout(() => (layer.style.opacity = '0'), ms);
  setTimeout(() => {
    fx.destroy();
    layer.remove();
  }, ms + 900);
}
