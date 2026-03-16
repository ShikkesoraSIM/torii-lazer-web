import React, { useState } from 'react';
import { FiMonitor } from 'react-icons/fi';
import {
  FloatingPortal,
  autoUpdate,
  flip,
  offset,
  shift,
  useDismiss,
  useFloating,
  useFocus,
  useHover,
  useInteractions,
  useRole,
} from '@floating-ui/react';
import {
  parseScoreClientVersion,
  type ScoreClientDisplayMode,
} from '../../utils/clientVersion';

interface ClientVersionDisplayProps {
  clientVersion?: string | null;
  mode?: ScoreClientDisplayMode;
  className?: string;
  iconClassName?: string;
}

const ClientVersionDisplay: React.FC<ClientVersionDisplayProps> = ({
  clientVersion,
  mode = 'icon',
  className = 'text-gray-500 dark:text-gray-400',
  iconClassName = 'w-3.5 h-3.5',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const clientInfo = parseScoreClientVersion(clientVersion);
  if (!clientInfo) return null;

  const tooltipText = [clientInfo.clientName, clientInfo.version, clientInfo.os]
    .filter(Boolean)
    .join(' • ');
  const detailLine = [clientInfo.version, clientInfo.os].filter(Boolean).join(' • ');

  const { refs, floatingStyles, context } = useFloating({
    open: isOpen,
    onOpenChange: setIsOpen,
    placement: 'top',
    middleware: [offset(10), flip(), shift({ padding: 12 })],
    whileElementsMounted: autoUpdate,
  });

  const hover = useHover(context, {
    delay: { open: 0, close: 80 },
    move: false,
  });
  const focus = useFocus(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: 'tooltip' });
  const { getReferenceProps, getFloatingProps } = useInteractions([hover, focus, dismiss, role]);

  const isActive = isHovered || isOpen;

  return (
    <>
      <span
        ref={refs.setReference}
        {...getReferenceProps({
          tabIndex: 0,
          onMouseEnter: () => setIsHovered(true),
          onMouseLeave: () => setIsHovered(false),
          onBlur: () => setIsHovered(false),
          className: `inline-flex items-center gap-1.5 min-w-0 ${className}`,
          'aria-label': tooltipText || clientInfo.summary,
        })}
      >
        <span
          className="inline-flex h-5 w-5 items-center justify-center cursor-help"
          style={
            isActive
              ? {
                  filter:
                    'drop-shadow(0 0 3px rgba(56, 189, 248, 0.95)) drop-shadow(0 0 8px rgba(56, 189, 248, 0.72))',
                }
              : {
                  filter: 'none',
                }
          }
        >
          <FiMonitor
            className={`${iconClassName} block transition-all duration-150`}
            aria-hidden="true"
            style={
              isActive
                ? {
                  color: 'rgb(224 242 254)',
                    overflow: 'visible',
                  }
                : {
                    overflow: 'visible',
                  }
            }
          />
        </span>

        {mode === 'name' && <span className="truncate">{clientInfo.clientName}</span>}
      </span>

      {isOpen && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps({
              className: 'z-[1200] pointer-events-none',
            })}
          >
            <div className="relative overflow-hidden rounded-xl border border-sky-300/30 bg-[linear-gradient(155deg,rgba(19,35,74,0.94),rgba(11,20,53,0.94))] px-3 py-2 shadow-[0_16px_36px_rgba(56,189,248,0.28)] backdrop-blur-xl min-w-[180px] max-w-[260px]">
              <div className="pointer-events-none absolute -top-7 -right-4 h-14 w-14 rounded-full bg-sky-400/28 blur-xl" />
              <div className="pointer-events-none absolute -bottom-7 -left-4 h-14 w-14 rounded-full bg-blue-500/24 blur-xl" />
              <div className="relative">
                <div className="text-[12px] font-semibold text-sky-100 leading-tight">
                  {clientInfo.clientName}
                </div>
                {detailLine ? (
                  <div className="mt-1 text-[11px] text-sky-100/85 break-all leading-tight">
                    {detailLine}
                  </div>
                ) : (
                  <div className="mt-1 text-[11px] text-sky-100/75 break-all leading-tight">
                    {clientInfo.raw}
                  </div>
                )}
              </div>
            </div>
          </div>
        </FloatingPortal>
      )}
    </>
  );
};

export default ClientVersionDisplay;
