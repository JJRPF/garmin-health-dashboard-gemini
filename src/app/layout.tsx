import type { Metadata, Viewport } from 'next';
import './globals.css';
import InstallPrompt from '@/components/InstallPrompt';

export const metadata: Metadata = {
  title: 'Garmin Health',
  description: 'Tu dashboard de salud personal conectado a Garmin',
  // manifest auto-registered by src/app/manifest.ts → /manifest.webmanifest
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Garmin Health',
  },
};

export const viewport: Viewport = {
  themeColor: '#080808',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body className="bg-bg min-h-screen">
        {children}
        <InstallPrompt />
      </body>
    </html>
  );
}
