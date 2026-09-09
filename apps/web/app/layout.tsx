import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: "And It's No Good — Fantasy kicking",
  description: 'One draft. One kicking position. Every miss matters.',
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
