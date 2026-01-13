import axios, { AxiosInstance, AxiosError } from 'axios';
import Cookies from 'js-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4001';

class ApiClient {
  private client: AxiosInstance;
  private isRedirecting = false; // Flag to prevent redirect loops

  constructor() {
    this.client = axios.create({
      baseURL: `${API_URL}`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token and ensure /api prefix
    this.client.interceptors.request.use(
      (config) => {
        const token = Cookies.get('auth_token');
        const lang = Cookies.get('lang') || 'en';
        
        // Ensure URL starts with /api (baseURL doesn't include it)
        if (config.url && !config.url.startsWith('/api/')) {
          config.url = `/api${config.url.startsWith('/') ? '' : '/'}${config.url}`;
        }
        
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        config.headers['Accept-Language'] = lang;
        
        return config;
      },
      (error) => Promise.reject(error),
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response.data,
      (error: AxiosError) => {
        if (error.response?.status === 401) {
          // Prevent redirect loops - only redirect if not already on login page and not already redirecting
          if (typeof window !== 'undefined' && 
              !window.location.pathname.includes('/login') && 
              !window.location.pathname.includes('/register') &&
              !this.isRedirecting) {
            this.isRedirecting = true;
            Cookies.remove('auth_token');
            // Small delay to prevent multiple redirects
            setTimeout(() => {
              window.location.href = '/login';
            }, 100);
          }
        }
        return Promise.reject(error);
      },
    );
  }

  async get<T = any>(url: string, config?: any): Promise<T> {
    const response = await this.client.get(url, config);
    return response as T;
  }

  async post<T = any>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.post(url, data, config);
    return response as T;
  }

  async put<T = any>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.put(url, data, config);
    return response as T;
  }

  async patch<T = any>(url: string, data?: any, config?: any): Promise<T> {
    const response = await this.client.patch(url, data, config);
    return response as T;
  }

  async delete<T = any>(url: string, config?: any): Promise<T> {
    const response = await this.client.delete(url, config);
    return response as T;
  }
}

export const api = new ApiClient();

