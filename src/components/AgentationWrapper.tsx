'use client';

import React, { useEffect, useState } from 'react';
import { Agentation } from 'agentation';

export const AgentationWrapper: React.FC = () => {
  const [mounted, setMounted] = useState(false);
  const [isTestEnv, setIsTestEnv] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (
      typeof window !== 'undefined' &&
      (window.navigator.userAgent.includes('Playwright') ||
       window.navigator.webdriver ||
       window.location.search.includes('no_agentation'))
    ) {
      setIsTestEnv(true);
    }
  }, []);

  if (!mounted || isTestEnv) return null;
  return <Agentation />;
};

