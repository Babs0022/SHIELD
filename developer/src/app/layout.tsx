import './globals.css';
import Providers from './providers';

export const metadata = {
  title: 'SHIELD Developer',
  description: 'Developer platform for secure content sharing',
};

export default function DeveloperLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}