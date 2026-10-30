import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/lib/theme';
import { AuthProvider } from '@/lib/auth/authContext';
import { PrefsProvider } from '@/lib/prefs/prefsContext';
import { SettingsProvider } from '@/lib/settings/settingsContext';
import { DeleteToastProvider } from '@/components/DeleteToast';

export const metadata: Metadata = {
  title: 'Researchie — In-Situ AI Research Workbench',
  description: 'High-signal in-situ research capture, spatial timeline, and AI synthesis workbench.',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const stored = localStorage.getItem('researchie_theme');
                if (stored === 'light') {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.classList.add('light');
                } else if (stored === 'dark') {
                  document.documentElement.classList.add('dark');
                  document.documentElement.classList.remove('light');
                } else if (window.matchMedia('(prefers-color-scheme: light)').matches) {
                  document.documentElement.classList.remove('dark');
                  document.documentElement.classList.add('light');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="antialiased min-h-screen selection:bg-blue-500/20">
        <ThemeProvider>
          <AuthProvider>
            <PrefsProvider>
              <SettingsProvider>
                <DeleteToastProvider>{children}</DeleteToastProvider>
              </SettingsProvider>
            </PrefsProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
