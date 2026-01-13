import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '@/store/authStore';
import Head from 'next/head';
import Cookies from 'js-cookie';

export default function AuthCallback() {
  const router = useRouter();
  const { setToken } = useAuthStore();

  useEffect(() => {
    const { token } = router.query;
    if (token && typeof token === 'string') {
      setToken(token);
      const lastService = Cookies.get('service');
      // Respect last selected service when redirecting after auth
      if (lastService === 'hrms') {
        router.push('/hrms/dashboard');
      } else {
        router.push('/');
      }
    } else {
      router.push('/login');
    }
  }, [router, setToken]);

  return (
    <>
      <Head>
        <title>Authenticating...</title>
      </Head>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 via-white to-red-50">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 shadow-lg mb-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
          </div>
          <p className="text-gray-600">Authenticating...</p>
        </div>
      </div>
    </>
  );
}

