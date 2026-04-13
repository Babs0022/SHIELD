import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'API Documentation | SHIELD Developer Platform',
  description: 'Complete API reference for the SHIELD Developer Platform',
};

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {children}
    </div>
  );
}
