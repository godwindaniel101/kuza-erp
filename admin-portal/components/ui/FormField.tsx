import { ReactNode, SelectHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

export type FormFieldType =
  | 'text'
  | 'email'
  | 'number'
  | 'select'
  | 'textarea'
  | 'date'
  | 'checkbox';

export interface FormFieldOption {
  value: string;
  label: string;
}

interface BaseProps {
  label?: string;
  /** Field name + html id. */
  name: string;
  required?: boolean;
  error?: string;
  help?: string;
  /** Accent color for the focus ring (red=IMS, blue=HRMS). */
  accent?: 'red' | 'blue';
  className?: string;
  disabled?: boolean;
}

interface InputProps extends BaseProps {
  type?: 'text' | 'email' | 'number' | 'date';
  value?: string | number;
  onChange?: (value: string) => void;
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number;
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
}

interface TextareaProps extends BaseProps {
  type: 'textarea';
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  rows?: number;
  textareaProps?: TextareaHTMLAttributes<HTMLTextAreaElement>;
}

interface SelectProps extends BaseProps {
  type: 'select';
  value?: string;
  onChange?: (value: string) => void;
  options: FormFieldOption[];
  placeholder?: string;
  selectProps?: SelectHTMLAttributes<HTMLSelectElement>;
}

interface CheckboxProps extends BaseProps {
  type: 'checkbox';
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  /** Inline label shown next to the checkbox. */
  checkboxLabel?: ReactNode;
}

export type FormFieldProps = InputProps | TextareaProps | SelectProps | CheckboxProps;

const baseControl =
  'w-full px-3 py-2 text-sm border rounded-md focus:outline-none focus-visible:ring-2 focus-visible:border-transparent transition-colors duration-150 disabled:opacity-60 disabled:cursor-not-allowed bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500';

const inputHeight = 'h-9';

export default function FormField(props: FormFieldProps) {
  const { label, name, required, error, help, className = '', disabled } = props;

  const focusRing = error
    ? 'focus-visible:ring-red-500 border-red-400 dark:border-red-500'
    : 'focus-visible:ring-brand-500 border-gray-300 dark:border-gray-700';

  const describedBy = error ? `${name}-error` : help ? `${name}-help` : undefined;

  const renderControl = () => {
    switch (props.type) {
      case 'select':
        return (
          <select
            id={name}
            name={name}
            value={props.value ?? ''}
            onChange={(e) => props.onChange?.(e.target.value)}
            required={required}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            className={`${baseControl} ${inputHeight} ${focusRing}`}
            {...props.selectProps}
          >
            {props.placeholder && (
              <option value="" disabled={required}>
                {props.placeholder}
              </option>
            )}
            {props.options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        );
      case 'textarea':
        return (
          <textarea
            id={name}
            name={name}
            value={props.value ?? ''}
            onChange={(e) => props.onChange?.(e.target.value)}
            placeholder={props.placeholder}
            rows={props.rows ?? 3}
            required={required}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            className={`${baseControl} ${focusRing}`}
            {...props.textareaProps}
          />
        );
      case 'checkbox':
        return (
          <label className="inline-flex items-center gap-2 cursor-pointer select-none">
            <input
              id={name}
              name={name}
              type="checkbox"
              checked={!!props.checked}
              onChange={(e) => props.onChange?.(e.target.checked)}
              disabled={disabled}
              aria-invalid={!!error}
              aria-describedby={describedBy}
              className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 text-brand-600 focus:ring-brand-500"
            />
            {props.checkboxLabel != null && (
              <span className="text-sm text-gray-700 dark:text-gray-300">{props.checkboxLabel}</span>
            )}
          </label>
        );
      default:
        return (
          <input
            id={name}
            name={name}
            type={props.type ?? 'text'}
            value={props.value ?? ''}
            onChange={(e) => props.onChange?.(e.target.value)}
            placeholder={props.placeholder}
            min={props.min}
            max={props.max}
            step={props.step}
            required={required}
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={describedBy}
            className={`${baseControl} ${inputHeight} ${focusRing}`}
            {...props.inputProps}
          />
        );
    }
  };

  // Checkbox lays out label inline (handled inside renderControl)
  const isCheckbox = props.type === 'checkbox';

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && !isCheckbox && (
        <label htmlFor={name} className="block text-[13px] font-medium text-gray-700 dark:text-gray-300">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}

      {isCheckbox && label ? (
        <div className="flex items-center justify-between">
          {renderControl()}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </div>
      ) : (
        renderControl()
      )}

      {error ? (
        <p id={`${name}-error`} className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
          <i className="bx bx-error-circle" aria-hidden="true"></i>
          {error}
        </p>
      ) : help ? (
        <p id={`${name}-help`} className="text-xs text-gray-500 dark:text-gray-400">
          {help}
        </p>
      ) : null}
    </div>
  );
}
