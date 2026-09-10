import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: "And It's No Good — Fantasy kicking",
  description: 'One draft. One kicking position. Every miss matters.',
  icons: {
    icon: [{ url: '/icon.png', type: 'image/png', sizes: '1024x1024' }],
    shortcut: ['/icon.png'],
    apple: [{ url: '/icon.png', type: 'image/png', sizes: '1024x1024' }],
  },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
