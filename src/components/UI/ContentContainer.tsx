import React, { useState, useRef, useEffect } from 'react';
import { t } from "i18next";

interface ContentContainerProps {
  children: React.ReactNode;
  maxHeight?: number; // max height in pixels
  className?: string;
  expandText?: string;
  collapseText?: string;
  showExpandButton?: boolean;
}

const ContentContainer: React.FC<ContentContainerProps> = ({
  children,
  maxHeight = 400,
  className = '',
  expandText = t("common.showMore"),
  collapseText = t("common.showLess"),
  showExpandButton = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const [measuredHeight, setMeasuredHeight] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const checkHeight = () => {
      if (contentRef.current) {
        const contentHeight = contentRef.current.scrollHeight;
        setMeasuredHeight(contentHeight);
        setShowButton(contentHeight > maxHeight);
      }
    };

    checkHeight();
    // Watch for content changes
    const resizeObserver = new ResizeObserver(checkHeight);
    if (contentRef.current) {
      resizeObserver.observe(contentRef.current);
    }

    return () => resizeObserver.disconnect();
  }, [maxHeight, children]);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // Bottom margin works together with the bottom button
  return (
    <div className={`relative transition-[margin-bottom] duration-300 ease-in-out ${isExpanded ? "mb-10" : ""} ${className}`}>
      {/* Content area */}
      <div
        ref={contentRef}
        className="overflow-hidden transition-[max-height] duration-300 ease-in-out"
        style={{
          maxHeight: measuredHeight
            ? `${showButton ? (isExpanded ? measuredHeight : Math.min(measuredHeight, maxHeight)) : measuredHeight}px`
            : undefined,
        }}
      >
        {children}
      </div>

      {/* Keep this pinned to the bottom of the content */}
      <div className="absolute bottom-0 left-0 right-0">
        {/* Gradient overlay - only when collapsed and the button is needed */}
        <div className={`h-16 bg-gradient-to-t from-white dark:from-gray-900 to-transparent pointer-events-none
        transition-all duration-300 ease-in-out ${!isExpanded && showButton && showExpandButton ? "" : "opacity-0"}`} />

        {/* Expand/collapse button - spacing adjusts when expanded; kept on top */}
        {showButton && showExpandButton && (
            <div className={`absolute justify-self-center text-center transition-[bottom] duration-200 z-10 ${
                isExpanded ? 'mb-0 -bottom-10' : 'bottom-0'
            }`}>
              <button
                  onClick={toggleExpanded}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-osu-pink hover:brightness-90 dark:text-osu-pink dark:hover:brightness-110 transition-all duration-200"
              >
                {/* Icon rotation animation */}
                <svg className={`w-4 h-4 mr-1 transition-transform duration-300 ${isExpanded ? "" : "rotate-180"}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                {isExpanded ? collapseText : expandText}
              </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default ContentContainer;