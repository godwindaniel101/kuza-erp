import { useEffect } from 'react';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
  duration?: number;
}

export default function Toast({ message, type = 'info', onClose, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const id = setTimeout(onClose, duration);
    return () => clearTimeout(id);
  }, [onClose, duration]);

  const color = type === 'success' ? 'green' : type === 'error' ? 'red' : 'gray';

  return (
    <div className={`fixed bottom-6 right-6 z-[1000] px-4 py-3 rounded-lg shadow-lg border bg-white dark:bg-gray-800 border-${color}-200 dark:border-${color}-800`}
         role="status" aria-live="polite">
      <div className="flex items-center space-x-3">
        <i className={`bx ${type === 'success' ? 'bx-check-circle' : type === 'error' ? 'bx-x-circle' : 'bx-info-circle'} text-${color}-600 dark:text-${color}-400 text-xl`}></i>
        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">{message}</span>
        <button type="button" onClick={onClose} className="ml-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
          <i className="bx bx-x"></i>
        </button>
      </div>
    </div>
  );
}
