import type { Metadata } from 'next';
import './globals.css';
import ThemeRegistry from '@/theme/ThemeRegistry';
import AppProviders from '@/contexts/AppProviders';
import AppLayout from '@/components/layout/AppLayout';

export const metadata: Metadata = {
  title: 'ML Platform Dashboard',
  description: 'Comprehensive machine learning operations platform'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeRegistry>
          <AppProviders>
            <AppLayout>{children}</AppLayout>
          </AppProviders>
        </ThemeRegistry>
      </body>
    </html>
  );
}
