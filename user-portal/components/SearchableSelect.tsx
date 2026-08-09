import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  searchPlaceholder?: string;
  focusColor?: 'red' | 'blue';
  /** Control height: 'md' (default, 48px — forms) or 'sm' (40px — filter bars). */
  size?: 'sm' | 'md';
}

export default function SearchableSelect({
  options,
  value,
  onChange,
  placeholder = 'Select an option...',
  disabled = false,
  required = false,
  className = '',
  searchPlaceholder = 'Search...',
  focusColor = 'red',
  size = 'md',
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  // Dropdown is portalled to <body> and fixed-positioned from the trigger's
  // rect, so it can never be clipped by a card's overflow-hidden.
  const [coords, setCoords] = useState<{ top: number; left: number; width: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const focusRingColor = 'focus-visible:ring-accent-ring ring-accent-ring';
  const selectedBgColor = 'bg-accent-soft text-accent';
  const checkColor = 'text-accent';

  useEffect(() => {
    if (!isOpen) {
      setCoords(null);
      return;
    }
    // Position the portalled dropdown just under the trigger, and keep it there
    // while the page scrolls/resizes.
    const updateCoords = () => {
      const el = containerRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setCoords({ top: r.bottom + 6, left: r.left, width: r.width });
    };
    updateCoords();

    // Close only when the click is outside BOTH the trigger and the (portalled)
    // dropdown — the dropdown is no longer a DOM child of the trigger.
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(0);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', updateCoords, true);
    window.addEventListener('resize', updateCoords);
    setTimeout(() => searchInputRef.current?.focus(), 100);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', updateCoords, true);
      window.removeEventListener('resize', updateCoords);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && filteredOptions.length > 0) {
      // Reset highlighted index when search changes
      setHighlightedIndex(0);
    }
  }, [searchTerm, isOpen, filteredOptions.length]);

  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      // Scroll highlighted option into view
      const highlightedElement = dropdownRef.current.querySelector(
        `[data-index="${highlightedIndex}"]`
      ) as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex, isOpen]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredOptions[highlightedIndex]) {
          handleSelect(filteredOptions[highlightedIndex].value);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        setSearchTerm('');
        break;
    }
  };

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setIsOpen(false);
    setSearchTerm('');
    setHighlightedIndex(0);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) {
            setIsOpen(!isOpen);
          }
        }}
        disabled={disabled}
        onKeyDown={handleKeyDown}
          className={`
          ss-control w-full max-w-[300px] border rounded-md
          ${size === 'sm' ? 'px-3 h-9 text-sm' : 'px-3 h-9 text-sm'}
          bg-white dark:bg-gray-800
          text-gray-900 dark:text-gray-100
          border-gray-200 dark:border-gray-700
          focus:outline-none focus-visible:ring-1 focus-visible:border-transparent ${focusRingColor}
          disabled:opacity-50 disabled:cursor-not-allowed
          flex items-center justify-between gap-2
          transition-colors duration-100
          ${isOpen ? 'ring-2 ring-accent-ring border-transparent' : ''}
        `}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={`${selectedOption ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'} truncate overflow-hidden flex-1 text-left`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <i className={`bx bx-chevron-${isOpen ? 'up' : 'down'} text-xl text-gray-400 dark:text-gray-500 transition-transform flex-shrink-0`}></i>
      </button>

      {isOpen && coords && createPortal(
        <div
          ref={dropdownRef}
          style={{ position: 'fixed', top: coords.top, left: coords.left, width: coords.width }}
          className="z-[9999] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-popover max-h-64 overflow-hidden"
          role="listbox"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Search Input */}
          <div className="p-2 border-b border-gray-200 dark:border-gray-700">
            <div className="relative">
              <i className="absolute left-3 top-1/2 -translate-y-1/2 bx bx-search text-gray-400 dark:text-gray-500"></i>
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={searchPlaceholder}
                className={`h-9 w-full max-w-[400px] pl-10 pr-4 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring text-[13px]`}
              />
            </div>
          </div>

          {/* Options List */}
          <div className="overflow-y-auto max-h-48">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                No options found
              </div>
            ) : (
              filteredOptions.map((option, index) => (
                <button
                  key={option.value}
                  type="button"
                  data-index={index}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelect(option.value);
                  }}
                  onMouseDown={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  className={`
                    w-full text-left px-4 py-3 text-sm 
                    transition-colors
                    ${
                      option.value === value
                        ? `${selectedBgColor} font-medium`
                        : highlightedIndex === index
                        ? 'bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100'
                        : 'text-gray-900 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }
                  `}
                  role="option"
                  aria-selected={option.value === value}
                >
                  <div className="flex items-center justify-between gap-2 min-w-0">
                    <span className="truncate overflow-hidden flex-1">{option.label}</span>
                    {option.value === value && (
                      <i className={`bx bx-check ${checkColor} flex-shrink-0`}></i>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>,
        document.body,
      )}

      {/* Hidden select for form submission */}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        disabled={disabled}
        className="sr-only"
        aria-hidden="true"
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

