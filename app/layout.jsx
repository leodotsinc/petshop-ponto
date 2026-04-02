import './globals.css';

export const metadata = {
  title: 'Ponto Digital',
  description: 'Controle de ponto para funcionários',
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className="bg-slate-50 text-slate-800 antialiased">
        {children}
      </body>
    </html>
  );
}
