import React, { useEffect, useRef } from 'react';
import '../../styles/bbcode.css';

interface BBCodeRendererProps {
  html: string;
  className?: string;
}

/**
 */
const BBCodeRenderer: React.FC<BBCodeRendererProps> = ({ html, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    const initializeSpoilerBoxes = () => {
      const spoilerLinks = container.querySelectorAll('.js-spoilerbox__link');
      const cleanupFunctions: (() => void)[] = [];
      
      spoilerLinks.forEach((button) => {
        const existingHandler = (button as any).__spoilerClickHandler;
        if (existingHandler) {
          button.removeEventListener('click', existingHandler);
        }
        
        const handleClick = (e: Event) => {
          e.preventDefault();
          e.stopPropagation();
          
          const spoilerBox = button.closest('.js-spoilerbox');
          const body = spoilerBox?.querySelector('.js-spoilerbox__body');
          
          if (body) {
            const isVisible = body.classList.contains('is-visible');
            body.classList.toggle('is-visible', !isVisible);
            button.setAttribute('aria-expanded', String(!isVisible));
            
            spoilerBox?.dispatchEvent(new CustomEvent('spoilerToggle', {
              detail: { expanded: !isVisible }
            }));
          }
        };

        (button as any).__spoilerClickHandler = handleClick;
        button.addEventListener('click', handleClick);
        
        button.setAttribute('aria-expanded', 'false');
        
        cleanupFunctions.push(() => {
          button.removeEventListener('click', handleClick);
          delete (button as any).__spoilerClickHandler;
        });
      });
      
      return () => {
        cleanupFunctions.forEach(cleanup => cleanup());
      };
    };

    const initializeSpoilers = () => {
      const spoilers = container.querySelectorAll('.spoiler');
      const cleanupFunctions: (() => void)[] = [];
      
      spoilers.forEach((spoiler) => {
        const handleReveal = () => {
          spoiler.classList.add('revealed');
        };

        const handleKeydown = (e: Event) => {
          const keyEvent = e as KeyboardEvent;
          if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
            e.preventDefault();
            handleReveal();
          }
        };

        spoiler.addEventListener('click', handleReveal);
        
        spoiler.addEventListener('mouseenter', handleReveal);
        
        spoiler.setAttribute('tabindex', '0');
        spoiler.setAttribute('role', 'button');
        spoiler.setAttribute('aria-label', 'Show hidden content');
        
        spoiler.addEventListener('keydown', handleKeydown);
        
        cleanupFunctions.push(() => {
          spoiler.removeEventListener('click', handleReveal);
          spoiler.removeEventListener('mouseenter', handleReveal);
          spoiler.removeEventListener('keydown', handleKeydown);
        });
      });
      
      return () => {
        cleanupFunctions.forEach(cleanup => cleanup());
      };
    };

    const initializeImageMaps = () => {
      const imageMaps = container.querySelectorAll('.imagemap');
      const cleanupFunctions: (() => void)[] = [];
      
      imageMaps.forEach((imageMap) => {
        const links = imageMap.querySelectorAll('.imagemap__link');
        
        links.forEach((link) => {
          const handleMouseEnter = () => {
            link.classList.add('hover');
          };
          
          const handleMouseLeave = () => {
            link.classList.remove('hover');
          };
          
          const handleClick = (e: Event) => {
            e.preventDefault();
          };
          
          link.addEventListener('mouseenter', handleMouseEnter);
          link.addEventListener('mouseleave', handleMouseLeave);
          
          if (!link.getAttribute('href') || link.getAttribute('href') === '#') {
            link.addEventListener('click', handleClick);
          }
          
          cleanupFunctions.push(() => {
            link.removeEventListener('mouseenter', handleMouseEnter);
            link.removeEventListener('mouseleave', handleMouseLeave);
            if (!link.getAttribute('href') || link.getAttribute('href') === '#') {
              link.removeEventListener('click', handleClick);
            }
          });
        });
      });
      
      return () => {
        cleanupFunctions.forEach(cleanup => cleanup());
      };
    };

    const cleanupSpoilerBoxes = initializeSpoilerBoxes();
    const cleanupSpoilers = initializeSpoilers();
    const cleanupImageMaps = initializeImageMaps();
    
    return () => {
      cleanupSpoilerBoxes?.();
      cleanupSpoilers?.();
      cleanupImageMaps?.();
    };

    const externalLinks = container.querySelectorAll('a[href^="http"]');
    externalLinks.forEach((link) => {
      link.setAttribute('target', '_blank');
      link.setAttribute('rel', 'noopener noreferrer');
    });

    const images = container.querySelectorAll('img[loading="lazy"]');
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            if (img.dataset.src) {
              img.src = img.dataset.src;
              img.removeAttribute('data-src');
              imageObserver.unobserve(img);
            }
          }
        });
      });

      images.forEach((img) => imageObserver.observe(img));

      return () => {
        imageObserver.disconnect();
      };
    }
  }, [html]);

  return (
    <div
      ref={containerRef}
      className={`bbcode-renderer ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
      aria-live="polite"
    />
  );
};

export default BBCodeRenderer;