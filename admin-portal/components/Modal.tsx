import { useEffect, useRef, ReactNode, useState } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  showCloseButton?: boolean;
  closeOnOutsideClick?: boolean;
  /** Optional footer (action row) rendered below a hairline. */
  footer?: ReactNode;
}

export default function Modal({
  isOpen,
  onClose,
  children,
  title,
  maxWidth = 'md',
  showCloseButton = true,
  closeOnOutsideClick = true,
  footer,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  // Handle escape key and body scroll
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      setShouldRender(true);
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      // Trigger animation after render
      setTimeout(() => setIsAnimating(true), 10);
    } else {
      // Start exit animation
      setIsAnimating(false);
      // Wait for animation to complete before unmounting
      const timer = setTimeout(() => {
        setShouldRender(false);
        document.body.style.overflow = 'unset';
      }, 300); // Match transition duration

      return () => {
        clearTimeout(timer);
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = 'unset';
      };
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  // Handle click outside
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnOutsideClick && modalRef.current && modalRef.current === e.target) {
      onClose();
    }
  };

  if (!shouldRender) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    full: 'max-w-full',
  };

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      {/* Backdrop — warm scrim + real blur, eased on the shared curve */}
      <div
        className={`absolute inset-0 bg-gray-950/45 backdrop-blur-md transition-opacity duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isAnimating ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Modal Content — single elevation (shadow in light, ring in dark) */}
      <div
        ref={contentRef}
        className={`modal-panel relative bg-white dark:bg-gray-900 rounded-2xl shadow-popover dark:ring-1 dark:ring-gray-800 w-full ${maxWidthClasses[maxWidth]} transform transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          isAnimating ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-[0.97] translate-y-2'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-100 dark:border-gray-800">
            {title && (
              <h2 className="font-display text-[15px] font-semibold tracking-tight text-gray-900 dark:text-gray-100">
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                onClick={onClose}
                className="ml-auto h-9 w-9 inline-flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors duration-150 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                aria-label="Close modal"
              >
                <i className="bx bx-x text-2xl"></i>
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-4">{children}</div>

        {/* Footer */}
        {footer && (
          <div className="flex items-center justify-end gap-2 px-4 py-4 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/60 rounded-b-xl">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

