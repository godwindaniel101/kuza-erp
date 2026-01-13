import { useState, useRef, useEffect } from 'react';
import { format, parse, isValid, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isSameMonth, addMonths, subMonths, isToday as isTodayFn } from 'date-fns';
import { useTranslation } from 'next-i18next';

interface DatePickerProps {
  value: string; // ISO date string (YYYY-MM-DD)
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  min?: string; // ISO date string
  max?: string; // ISO date string
  focusColor?: 'red' | 'blue';
}

export default function DatePicker({
  value,
  onChange,
  placeholder = 'Select date...',
  disabled = false,
  required = false,
  className = '',
  min,
  max,
  focusColor = 'red',
}: DatePickerProps) {
  const { t } = useTranslation('common');
  const [isOpen, setIsOpen] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(value ? (isValid(parse(value, 'yyyy-MM-dd', new Date())) ? parse(value, 'yyyy-MM-dd', new Date()) : new Date()) : new Date());
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Parse value and set calendar month
  useEffect(() => {
    if (value) {
      try {
        const date = parse(value, 'yyyy-MM-dd', new Date());
        if (isValid(date)) {
          setCalendarMonth(date);
        }
      } catch {
        // Invalid date
      }
    }
  }, [value]);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleDateSelect = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    onChange(dateString);
    setIsOpen(false);
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCalendarMonth(prev => direction === 'prev' ? subMonths(prev, 1) : addMonths(prev, 1));
  };

  const isDateDisabled = (date: Date) => {
    if (min) {
      const minDate = parse(min, 'yyyy-MM-dd', new Date());
      if (isValid(minDate) && date < minDate) return true;
    }
    if (max) {
      const maxDate = parse(max, 'yyyy-MM-dd', new Date());
      if (isValid(maxDate) && date > maxDate) return true;
    }
    return false;
  };

  const selectedDate = value ? (isValid(parse(value, 'yyyy-MM-dd', new Date())) ? parse(value, 'yyyy-MM-dd', new Date()) : null) : null;
  const displayValue = selectedDate ? format(selectedDate, 'MMM dd, yyyy') : '';

  // Get calendar days
  const monthStart = startOfMonth(calendarMonth);
  const monthEnd = endOfMonth(calendarMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const focusRingColor = focusColor === 'blue' ? 'focus-visible:ring-blue-500' : 'focus-visible:ring-red-500';
  const selectedBg = focusColor === 'blue' ? 'bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600' : 'bg-red-600 hover:bg-red-700 dark:bg-red-500 dark:hover:bg-red-600';

  return (
    <div ref={containerRef} className={`relative min-w-[140px] ${className}`}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={() => {}} // Read-only input, opens calendar
          onFocus={() => !disabled && setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          readOnly
          className={`
            w-full min-h-[48px] px-4 py-3 pl-10 pr-10 border rounded-lg 
            bg-white dark:bg-gray-700 
            text-gray-900 dark:text-gray-100 
            border-gray-300 dark:border-gray-600 
            focus:outline-none focus-visible:ring-1 focus-visible:border-transparent ${focusRingColor}
            disabled:opacity-50 disabled:cursor-not-allowed
            placeholder-gray-400 dark:placeholder-gray-500
            cursor-pointer
          `}
        />
        <i className="absolute left-3 top-1/2 -translate-y-1/2 bx bx-calendar text-gray-400 dark:text-gray-500 pointer-events-none"></i>
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 z-10"
        >
          <i className={`bx bx-chevron-${isOpen ? 'up' : 'down'}`}></i>
        </button>
      </div>

      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl p-4">
          {/* Calendar Header */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => navigateMonth('prev')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <i className="bx bx-chevron-left text-gray-600 dark:text-gray-400 text-lg"></i>
            </button>
            <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-base">
              {monthNames[calendarMonth.getMonth()]} {calendarMonth.getFullYear()}
            </h3>
            <button
              type="button"
              onClick={() => navigateMonth('next')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <i className="bx bx-chevron-right text-gray-600 dark:text-gray-400 text-lg"></i>
            </button>
          </div>

          {/* Day Names */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {dayNames.map(day => (
              <div key={day} className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, index) => {
              const isCurrentMonth = isSameMonth(day, calendarMonth);
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isDayToday = isTodayFn(day);
              const isDisabled = !isCurrentMonth || isDateDisabled(day);

              return (
                <button
                  key={index}
                  type="button"
                  onClick={() => !isDisabled && handleDateSelect(day)}
                  disabled={isDisabled}
                  className={`
                    aspect-square rounded-lg text-sm font-medium transition-all
                    ${isDisabled 
                      ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed opacity-50' 
                      : 'text-gray-900 dark:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer'
                    }
                    ${!isCurrentMonth ? 'opacity-30' : ''}
                    ${isSelected 
                      ? `${selectedBg} text-white shadow-md` 
                      : ''
                    }
                    ${isDayToday && !isSelected 
                      ? 'ring-2 ring-gray-400 dark:ring-gray-500' 
                      : ''
                    }
                  `}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>

          {/* Today Button */}
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={() => handleDateSelect(new Date())}
              className="w-full px-4 py-2 text-sm text-center text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
            >
              Today
            </button>
          </div>
        </div>
      )}

      {/* Hidden input for form submission */}
      <input
        type="hidden"
        value={value || ''}
        required={required}
      />
    </div>
  );
}
