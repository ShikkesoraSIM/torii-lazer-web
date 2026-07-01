import React, { useState } from 'react';
import { FiMonitor, FiCommand, FiTerminal, FiSmartphone } from 'react-icons/fi';
import type { IconType } from 'react-icons';
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
  type ClientStream,
  type ClientPlatform,
} from '../../utils/clientVersion';

interface ClientVersionDisplayProps {
  clientVersion?: string | null;
  mode?: ScoreClientDisplayMode;
  className?: string;
  iconClassName?: string;
}

interface StreamTheme {
  rgb: string; // "r, g, b" so it slots into rgba() glows
  iconColor: string;
  titleColor: string;
  detailColor: string;
  borderColor: string;
  gradient: string;
}

// Per-stream palette: Torii red, Nova amber, Vanilla cyan. Legacy Shigetiro rides
// the red theme; plain lazer / unknown keep the original sky look.
const STREAM_THEMES: Record<ClientStream, StreamTheme> = {
  torii: {
    rgb: '244, 63, 94',
    iconColor: 'rgb(254 205 211)',
    titleColor: 'rgb(254 205 211)',
    detailColor: 'rgba(254, 205, 211, 0.85)',
    borderColor: 'rgba(244, 63, 94, 0.32)',
    gradient: 'linear-gradient(155deg,rgba(74,19,34,0.94),rgba(53,11,20,0.94))',
  },
  nova: {
    rgb: '245, 158, 11',
    iconColor: 'rgb(253 230 138)',
    titleColor: 'rgb(253 230 138)',
    detailColor: 'rgba(253, 230, 138, 0.85)',
    borderColor: 'rgba(245, 158, 11, 0.32)',
    gradient: 'linear-gradient(155deg,rgba(74,54,19,0.94),rgba(53,37,11,0.94))',
  },
  vanilla: {
    rgb: '34, 211, 238',
    iconColor: 'rgb(207 250 254)',
    titleColor: 'rgb(207 250 254)',
    detailColor: 'rgba(207, 250, 254, 0.85)',
    borderColor: 'rgba(34, 211, 238, 0.32)',
    gradient: 'linear-gradient(155deg,rgba(15,59,66,0.94),rgba(10,42,48,0.94))',
  },
  shigetiro: {
    rgb: '244, 63, 94',
    iconColor: 'rgb(254 205 211)',
    titleColor: 'rgb(254 205 211)',
    detailColor: 'rgba(254, 205, 211, 0.85)',
    borderColor: 'rgba(244, 63, 94, 0.32)',
    gradient: 'linear-gradient(155deg,rgba(74,19,34,0.94),rgba(53,11,20,0.94))',
  },
  lazer: {
    rgb: '56, 189, 248',
    iconColor: 'rgb(224 242 254)',
    titleColor: 'rgb(224 242 254)',
    detailColor: 'rgba(224, 242, 254, 0.85)',
    borderColor: 'rgba(125, 211, 252, 0.3)',
    gradient: 'linear-gradient(155deg,rgba(19,35,74,0.94),rgba(11,20,53,0.94))',
  },
  unknown: {
    rgb: '56, 189, 248',
    iconColor: 'rgb(224 242 254)',
    titleColor: 'rgb(224 242 254)',
    detailColor: 'rgba(224, 242, 254, 0.85)',
    borderColor: 'rgba(125, 211, 252, 0.3)',
    gradient: 'linear-gradient(155deg,rgba(19,35,74,0.94),rgba(11,20,53,0.94))',
  },
};

const PLATFORM_ICONS: Record<ClientPlatform, IconType> = {
  windows: FiMonitor,
  macos: FiCommand,
  linux: FiTerminal,
  android: FiSmartphone,
  ios: FiSmartphone,
  unknown: FiMonitor,
};

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

  const theme = STREAM_THEMES[clientInfo.stream];
  const PlatformIcon = PLATFORM_ICONS[clientInfo.platform];

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
                    `drop-shadow(0 0 3px rgba(${theme.rgb}, 0.95)) drop-shadow(0 0 8px rgba(${theme.rgb}, 0.72))`,
                }
              : {
                  filter: 'none',
                }
          }
        >
          <PlatformIcon
            className={`${iconClassName} block transition-all duration-150`}
            aria-hidden="true"
            style={{
              color: theme.iconColor,
              overflow: 'visible',
            }}
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
            <div
              className="relative overflow-hidden rounded-xl border px-3 py-2 backdrop-blur-xl min-w-[180px] max-w-[260px]"
              style={{
                borderColor: theme.borderColor,
                backgroundImage: theme.gradient,
                boxShadow: `0 16px 36px rgba(${theme.rgb}, 0.28)`,
              }}
            >
              <div
                className="pointer-events-none absolute -top-7 -right-4 h-14 w-14 rounded-full blur-xl"
                style={{ backgroundColor: `rgba(${theme.rgb}, 0.28)` }}
              />
              <div
                className="pointer-events-none absolute -bottom-7 -left-4 h-14 w-14 rounded-full blur-xl"
                style={{ backgroundColor: `rgba(${theme.rgb}, 0.24)` }}
              />
              <div className="relative">
                <div
                  className="text-[12px] font-semibold leading-tight"
                  style={{ color: theme.titleColor }}
                >
                  {clientInfo.clientName}
                </div>
                {detailLine ? (
                  <div
                    className="mt-1 text-[11px] break-all leading-tight"
                    style={{ color: theme.detailColor }}
                  >
                    {detailLine}
                  </div>
                ) : (
                  <div
                    className="mt-1 text-[11px] break-all leading-tight"
                    style={{ color: theme.detailColor }}
                  >
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
