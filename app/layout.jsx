import './globals.css';
import { Nunito, Manrope } from 'next/font/google';

const sans = Manrope({
  subsets: ['latin'],
  variable: '--font-sans',
});

const display = Nunito({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['700', '800', '900'],
});

export const metadata = {
  title: 'Ponto Digital',
  description: 'Controle de ponto para funcionários',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Ponto Digital',
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0f766e',
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var storedTheme = localStorage.getItem('petshop-theme');
                  var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var theme = storedTheme === 'light' || storedTheme === 'dark'
                    ? storedTheme
                    : (systemDark ? 'dark' : 'light');
                  document.documentElement.dataset.theme = theme;
                  document.documentElement.style.colorScheme = theme;
                } catch (error) {}
              })();
            `,
          }}
        />
      </head>
      <body className={`${sans.variable} ${display.variable} bg-[var(--color-cream)] text-[var(--color-ink)] antialiased`}>
        {children}
      </body>
    </html>
  );
}
