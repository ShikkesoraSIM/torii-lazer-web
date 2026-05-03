// Admin-only banner shown on top of a user's profile when the backend
// has flagged them as suspicious (one or more open alerts in the
// suspicious_alerts table). The visibility model is server-driven:
// the GET /users/:id endpoint only attaches `is_suspicious` (and the
// other three fields below) when the *viewer* has is_admin=true.
// Non-admin viewers therefore receive a User payload where
// is_suspicious is undefined, this component renders null, and the
// flag is never leaked to the public — see
// g0v0-server/app/service/suspicious_summary.py for the rationale.
//
// Trust-score colour bands mirror the backend constants:
//   >=80  amber  (1 warning, low concern)
//   50-79 orange (multiple warnings or one critical)
//   <50   red    (high concern — multiple criticals or many warnings)
// Keep these in sync with TRUST_AMBER_FLOOR / TRUST_ORANGE_FLOOR in
// suspicious_summary.py if you re-tune the weights.

import React from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';

interface SuspiciousBannerProps {
  is_suspicious?: boolean;
  trust_score?: number;
  suspicious_reasons?: string[];
  open_alert_count?: number;
  className?: string;
}

const TRUST_AMBER_FLOOR = 80;
const TRUST_ORANGE_FLOOR = 50;

const REASONS_VISIBLE = 3;

function gradientFor(score: number): string {
  // Tailwind gradient pairs picked to be readable against the dark
  // profile cover and obviously-distinct from the green Donator badge.
  if (score >= TRUST_AMBER_FLOOR) return 'from-amber-600 to-amber-700';
  if (score >= TRUST_ORANGE_FLOOR) return 'from-orange-600 to-orange-700';
  return 'from-red-600 to-red-700';
}

function bandLabel(score: number): string {
  if (score >= TRUST_AMBER_FLOOR) return 'Low concern';
  if (score >= TRUST_ORANGE_FLOOR) return 'Moderate concern';
  return 'High concern';
}

const SuspiciousBanner: React.FC<SuspiciousBannerProps> = ({
  is_suspicious,
  trust_score,
  suspicious_reasons = [],
  open_alert_count,
  className = '',
}) => {
  // Render gate: server only attaches these fields for admin viewers,
  // so absence == not-an-admin OR clean user. Either way: render nothing.
  if (!is_suspicious) return null;

  // Default trust to 100 if missing — the backend always sends it
  // alongside is_suspicious, but be defensive against partial payloads.
  const score = typeof trust_score === 'number' ? trust_score : 100;
  const gradient = gradientFor(score);

  const visibleReasons = suspicious_reasons.slice(0, REASONS_VISIBLE);
  const hiddenReasonCount = Math.max(0, suspicious_reasons.length - REASONS_VISIBLE);
  const totalAlerts = open_alert_count ?? suspicious_reasons.length;

  return (
    <div
      className={`bg-gradient-to-r ${gradient} text-white rounded-2xl shadow-lg p-4 sm:p-5 ${className}`}
      role="alert"
      aria-label="Admin: suspicious activity flagged on this account"
    >
      <div className="flex items-start gap-3">
        <FaExclamationTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-sm font-semibold uppercase tracking-wide">
              Suspicious activity flagged
            </span>
            <span className="text-xs uppercase opacity-90">
              {bandLabel(score)} · trust {score}/100 · {totalAlerts} open alert{totalAlerts === 1 ? '' : 's'}
            </span>
          </div>

          {visibleReasons.length > 0 && (
            <ul className="mt-2 text-sm space-y-1 list-disc list-inside opacity-95">
              {visibleReasons.map((reason, idx) => (
                <li key={`${idx}-${reason}`}>{reason}</li>
              ))}
              {hiddenReasonCount > 0 && (
                <li className="opacity-75 italic list-none pl-5">+{hiddenReasonCount} more</li>
              )}
            </ul>
          )}

          <div className="mt-2 text-xs opacity-80">
            Visible to admins only. Resolve alerts in the admin panel to clear this banner.
          </div>
        </div>
      </div>
    </div>
  );
};

export default SuspiciousBanner;
