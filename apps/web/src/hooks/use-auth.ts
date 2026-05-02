'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/utils';

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId: string;
  organization?: { id: string; name: string; slug: string };
}

export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      router.push('/login');
      return;
    }

    apiFetch<{ data: User }>('/auth/me')
      .then((res) => setUser(res.data))
      .catch(() => {
        localStorage.removeItem('token');
        router.push('/login');
      })
      .finally(() => setLoading(false));
  }, [router]);

  return { user, loading };
}
