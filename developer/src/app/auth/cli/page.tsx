import { Suspense } from 'react';
import CLIAuthContent from './CLIAuthContent';

export default function CLIAuthPage() {
  return (
    <Suspense fallback={<div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>}>
      <CLIAuthContent />
    </Suspense>
  );
}
