'use client';

import { useEffect, useState } from 'react';

const STORAGE_KEY = 'petshop-theme';

function getPreferredTheme() {
  if (typeof window === 'undefined') return 'light';

  const storedTheme = window.localStorage.getItem(STORAGE_KEY);
  if (storedTheme === 'light' || storedTheme === 'dark') return storedTheme;

  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;

  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) {
    themeMeta.setAttribute('content', theme === 'dark' ? '#08111f' : '#0f766e');
  }
}

export default function ThemeToggle({ className = '', subtle = false }) {
  const [theme, setTheme] = useState('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const preferredTheme = getPreferredTheme();
    setTheme(preferredTheme);
    applyTheme(preferredTheme);
    setMounted(true);
  }, []);

  function toggleTheme() {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    window.localStorage.setItem(STORAGE_KEY, nextTheme);
    applyTheme(nextTheme);
  }

  const label = mounted && theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className={`theme-toggle ${subtle ? 'theme-toggle-subtle' : ''} ${className}`}
    >
      <span className="theme-toggle-track">
        <span className={`theme-toggle-thumb ${mounted && theme === 'dark' ? 'theme-toggle-thumb-dark' : ''}`}>
          {mounted && theme === 'dark' ? <MoonIcon /> : <SunIcon />}
        </span>
      </span>
      <span className="theme-toggle-label">
        {mounted && theme === 'dark' ? 'Dark' : 'Light'}
      </span>
    </button>
  );
}

function SunIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m0 13.5V21m9-9h-2.25M5.25 12H3m14.364 6.364-1.591-1.591M8.227 8.227 6.636 6.636m10.728 0-1.591 1.591M8.227 15.773l-1.591 1.591M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 0 1 11.21 3c0 .34-.02.677-.06 1.01A9 9 0 1 0 20 12.85c.34-.04.67-.06 1-.06Z" />
    </svg>
  );
}
