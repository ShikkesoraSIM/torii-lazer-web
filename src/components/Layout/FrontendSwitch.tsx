import React from 'react';
import { Columns2 } from 'lucide-react';
import { useFrontendExperience } from '../../contexts/FrontendExperienceContext';

const FrontendSwitch: React.FC = () => {
  const { openChooser } = useFrontendExperience();

  return (
    <button
      type="button"
      onClick={openChooser}
      aria-label="Change frontend"
      aria-describedby="frontend-switch-tooltip"
      aria-haspopup="dialog"
      className="torii-frontend-switch"
    >
      <Columns2 aria-hidden="true" />

      <span id="frontend-switch-tooltip" className="torii-frontend-switch__tip" role="tooltip">
        <strong>Change frontend</strong>
        <span>Pick Torii or Torii Web again.</span>
      </span>
    </button>
  );
};

export default FrontendSwitch;
