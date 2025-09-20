import type { Metadata } from 'next';
import './globals.css';
import ThemeRegistry from '@/theme/ThemeRegistry';
import AppProviders from '@/contexts/AppProviders';
import AppLayout from '@/components/layout/AppLayout';
import { Inter, Noto_Sans } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const notoSans = Noto_Sans({ subsets: ['latin'], variable: '--font-noto-sans', display: 'swap' });

export const metadata: Metadata = {
  title: 'ML Platform Dashboard',
  description: 'Comprehensive machine learning operations platform'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${notoSans.variable}`}>
        <ThemeRegistry>
          <AppProviders>
            <AppLayout>{children}</AppLayout>
          </AppProviders>
        </ThemeRegistry>
      </body>
    </html>
  );
}
