import { useEffect, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import { motion } from 'framer-motion';
import type { FrontendExperience } from '../../utils/frontendExperience';

type Props = {
  canDismiss: boolean;
  currentPreference: FrontendExperience | null;
  onDismiss: () => void;
  onSelect: (preference: FrontendExperience, remember: boolean) => void;
};

const choices: Array<{
  id: FrontendExperience;
  name: string;
  description: string;
  screenshot: string;
}> = [
  {
    id: 'classic',
    name: 'Torii',
    description: 'The original website. It has all the Torii features!',
    screenshot: '/image/frontend-choice/classic.webp',
  },
  {
    id: 'torii-web',
    name: 'Torii Web',
    description: 'An osu!web-style alternative. It\'s still under development, some features are missing and you bugs might happen.',
    screenshot: '/image/frontend-choice/torii-web.webp',
  },
];

const FrontendChoiceOverlay = ({
  canDismiss,
  currentPreference,
  onDismiss,
  onSelect,
}: Props) => {
  const [remember, setRemember] = useState(true);
  const [active, setActive] = useState<FrontendExperience | null>(null);
  const [selected, setSelected] = useState<FrontendExperience | null>(null);
  const selecting = useRef(false);
  const activeChoice = selected ?? active;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && canDismiss && !selecting.current) onDismiss();
    };

    document.body.classList.add('frontend-choice-open');
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.classList.remove('frontend-choice-open');
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [canDismiss, onDismiss]);

  const choose = (preference: FrontendExperience) => {
    if (selecting.current) return;
    selecting.current = true;
    setSelected(preference);
    window.setTimeout(() => onSelect(preference, remember), 460);
  };

  return (
    <div
      className={`frontend-choice ${selected ? `frontend-choice--leaving frontend-choice--${selected}` : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="frontend-choice-title"
    >
      <header className="frontend-choice__header">
        <img className="frontend-choice__logo" src="/image/logos/torii-32.png" alt="" width="32" height="32" />
        <h1 id="frontend-choice-title">Choose your view</h1>
      </header>

      {canDismiss && (
        <button className="frontend-choice__close" type="button" onClick={onDismiss} aria-label="Close frontend chooser">
          <X aria-hidden="true" />
        </button>
      )}

      <div className="frontend-choice__options">
        {choices.map((choice, index) => {
          const isActive = activeChoice === choice.id;
          const anotherIsActive = activeChoice !== null && !isActive;

          return (
          <motion.button
            className={`frontend-choice__option frontend-choice__option--${choice.id}`}
            type="button"
            onClick={() => choose(choice.id)}
            onHoverStart={() => !selecting.current && setActive(choice.id)}
            onHoverEnd={() => !selecting.current && setActive(null)}
            onFocus={() => !selecting.current && setActive(choice.id)}
            onBlur={() => !selecting.current && setActive(null)}
            initial={{ opacity: 0, y: 8 }}
            animate={{
              opacity: selected && !isActive ? .4 : 1,
              y: 0,
            }}
            transition={{
              duration: .4,
              ease: [.22, 1, .36, 1],
              delay: selected ? 0 : index * .08,
            }}
            data-active={isActive || undefined}
            data-muted={anotherIsActive || undefined}
            aria-pressed={currentPreference === choice.id}
            aria-label={`Use ${choice.name}`}
            aria-describedby={`frontend-choice-description-${choice.id}`}
            key={choice.id}
          >
            <span className="frontend-choice__shot">
              <img
                src={choice.screenshot}
                alt={`${choice.name} profile page`}
                draggable="false"
                width="1000"
                height="1300"
              />
              <span className="frontend-choice__selected" aria-hidden="true">
                <Check />
              </span>
              {currentPreference === choice.id && <span className="frontend-choice__current">Current</span>}
            </span>
            <span className="frontend-choice__label">
              <strong>{choice.name}</strong>
              <span id={`frontend-choice-description-${choice.id}`}>{choice.description}</span>
            </span>
          </motion.button>
          );
        })}
      </div>

      <footer className="frontend-choice__preferences">
        <label className="frontend-choice__remember">
          <input
            type="checkbox"
            checked={remember}
            onChange={(event) => setRemember(event.target.checked)}
          />
          <span className="frontend-choice__check" aria-hidden="true"><Check /></span>
          <span>Remember my choice</span>
        </label>
      </footer>
    </div>
  );
};

export default FrontendChoiceOverlay;
