'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/login?tab=register');
  }, [router]);

  return <div className="ob-grid min-h-screen bg-[#EAEEF4] dark:bg-[#09090B]" />;
}
