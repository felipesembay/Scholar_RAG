import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

interface TooltipProps {
  content: string;
  children: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  disabled?: boolean;
  className?: string;
}

export default function Tooltip({ 
  content, 
  children, 
  position = 'top',
  delay = 500,
  disabled = false,
  className = ''
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const showTooltip = () => {
    if (disabled) return;
    
    const id = setTimeout(() => {
      setIsVisible(true);
    }, delay);
    setTimeoutId(id);
  };

  const hideTooltip = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
    setIsVisible(false);
  };

  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
  };

  const arrowClasses = {
    top: 'top-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-ink',
    bottom: 'bottom-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-ink',
    left: 'left-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-ink',
    right: 'right-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-ink'
  };

  return (
    <div 
      className={`relative inline-block ${className}`}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      
      <AnimatePresence>
        {isVisible && content && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={`
              absolute z-50 px-3 py-2 text-sm text-white bg-[var(--ink)] rounded-lg
              shadow-lg border border-gray-300 pointer-events-none
              max-w-xs whitespace-nowrap
              ${positionClasses[position]}
            `}
            role="tooltip"
          >
            {content}
            
            {/* Arrow */}
            <div 
              className={`
                absolute border-4 
                ${arrowClasses[position]}
              `}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Hook para tooltip programático
export function useTooltip() {
  const [tooltipContent, setTooltipContent] = useState<string>('');
  const [isVisible, setIsVisible] = useState(false);
  
  const showTooltip = (content: string) => {
    setTooltipContent(content);
    setIsVisible(true);
  };
  
  const hideTooltip = () => {
    setIsVisible(false);
    setTooltipContent('');
  };
  
  return {
    tooltipContent,
    isVisible,
    showTooltip,
    hideTooltip
  };
}