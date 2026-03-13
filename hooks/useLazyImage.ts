import { useState, useEffect, useRef } from 'react';

/**
 * Hook de lazy loading d'image via IntersectionObserver.
 * L'image ne se charge que quand la vignette entre dans le viewport.
 * Une fois chargée, l'URL est mémorisée — elle ne se recharge pas
 * quand on change d'onglet et qu'on revient.
 */
export const useLazyImage = (src: string | undefined) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Observe quand l'élément entre dans le viewport
  useEffect(() => {
    if (!src) return;
    const el = ref.current;
    if (!el) return;

    // Si déjà visible (ex: retour sur l'onglet), on déclenche directement
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' } // Précharge 100px avant d'entrer dans le viewport
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [src]);

  const onLoad = () => setIsLoaded(true);
  const onError = () => setHasError(true);

  return { ref, isVisible, isLoaded, hasError, onLoad, onError };
};
