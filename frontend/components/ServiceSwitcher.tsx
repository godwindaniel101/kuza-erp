import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';
import Cookies from 'js-cookie';

interface Service {
  id: string;
  code: string;
  name: string;
  description?: string;
  icon: string;
  color: 'red' | 'blue';
}

export default function ServiceSwitcher() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [services, setServices] = useState<Service[]>([]);
  const [currentService, setCurrentService] = useState<Service | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadServices();
  }, [router.pathname]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  const loadServices = () => {
    // Determine current service from route
    const path = router.pathname;
    let current: Service | null = null;

    if (path.startsWith('/hrms')) {
      current = {
        id: 'hrms',
        code: 'hrms',
        name: 'HRMS',
        icon: 'bx-group',
        color: 'blue',
      };
    } else {
      current = {
        id: 'rms',
        code: 'rms',
        name: 'RMS',
        icon: 'bx-restaurant',
        color: 'red',
      };
    }

  setCurrentService(current);
  // Keep a cookie with last selected service for refresh persistence
  Cookies.set('service', current.code, { expires: 7 });
    setServices([
      current,
      {
        id: current.code === 'rms' ? 'hrms' : 'rms',
        code: current.code === 'rms' ? 'hrms' : 'rms',
        name: current.code === 'rms' ? 'HRMS' : 'RMS',
        icon: current.code === 'rms' ? 'bx-group' : 'bx-restaurant',
        color: current.code === 'rms' ? 'blue' : 'red',
      },
    ]);
  };

  const handleSwitch = (serviceCode: string) => {
    setOpen(false);
    Cookies.set('service', serviceCode, { expires: 7 });
    if (serviceCode === 'hrms') {
      router.push('/hrms/dashboard');
    } else {
      router.push('/');
    }
  };

  if (services.length <= 1) return null;

  const colorClass = currentService?.color === 'red' ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400';
  const displayName = currentService?.name === 'Restaurant Management' || currentService?.code === 'rms' ? 'RMS' : currentService?.name || 'Select Service';

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center space-x-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
      >
        {currentService && (
          <>
            <i className={`bx ${currentService.icon} ${colorClass} text-xl`}></i>
            <span className="font-medium text-gray-900 dark:text-gray-100">{displayName}</span>
          </>
        )}
        {!currentService && <span className="font-medium text-gray-900 dark:text-gray-100">Select Service</span>}
        <i className="bx bx-chevron-down text-gray-600 dark:text-gray-400"></i>
      </button>

      {open && (
        <div
          className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50"
          style={{ display: open ? 'block' : 'none' }}
        >
          <div className="p-2">
            {services.map((service) => {
              const isActive = currentService?.id === service.id;
              const serviceColorClass = service.color === 'red' ? 'text-red-600 dark:text-red-400' : 'text-blue-600 dark:text-blue-400';
              const serviceBgClass =
                service.color === 'red'
                  ? isActive
                    ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                    : ''
                  : isActive
                  ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                  : '';
              const serviceDisplayName = service.name === 'Restaurant Management' || service.code === 'rms' ? 'RMS' : service.name;

              return (
                <button
                  key={service.id}
                  onClick={() => handleSwitch(service.code)}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${serviceBgClass}`}
                >
                  <i className={`bx ${service.icon} ${serviceColorClass} text-xl`}></i>
                  <div className="flex-1 text-left">
                    <div className="font-medium text-gray-900 dark:text-gray-100">{serviceDisplayName}</div>
                    {service.description && (
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {service.description.substring(0, 40)}
                      </div>
                    )}
                  </div>
                  {isActive && <i className={`bx bx-check ${serviceColorClass}`}></i>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
