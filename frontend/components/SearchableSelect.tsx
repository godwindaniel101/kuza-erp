import { useState, useRef, useEffect } from 'react';

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
}: SearchableSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const focusRingColor = focusColor === 'blue' ? 'focus-visible:ring-blue-500 ring-blue-500' : 'focus-visible:ring-red-500 ring-red-500';
  const selectedBgColor = focusColor === 'blue' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300';
  const checkColor = focusColor === 'blue' ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400';

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
        setHighlightedIndex(0);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      // Focus search input when dropdown opens
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
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
          w-full px-4 py-2 border rounded-lg 
          bg-white dark:bg-gray-700 
          text-gray-900 dark:text-gray-100 
          border-gray-300 dark:border-gray-600 
          focus:outline-none focus-visible:ring-1 focus-visible:border-transparent ${focusRingColor}
          disabled:opacity-50 disabled:cursor-not-allowed
          flex items-center justify-between gap-2
          transition-colors
          min-h-[48px]
          ${isOpen ? `ring-2 ${focusColor === 'blue' ? 'ring-blue-500' : 'ring-red-500'} border-transparent` : ''}
        `}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className={`${selectedOption ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'} truncate overflow-hidden flex-1 text-left`}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <i className={`bx bx-chevron-${isOpen ? 'up' : 'down'} text-xl text-gray-400 dark:text-gray-500 transition-transform flex-shrink-0`}></i>
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-[9999] w-full mt-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-64 overflow-hidden"
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
                className={`w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus-visible:ring-1 ${focusColor === 'blue' ? 'focus-visible:ring-blue-500' : 'focus-visible:ring-red-500'}`}
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
        </div>
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

