import { ReactNode } from 'react';
import BottomNav from './BottomNav';

const AppLayout = ({ children }: { children: ReactNode }) => {
  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto">
      <main className="pb-24">
        {children}
      </main>
      <BottomNav />
    </div>
  );
};

export default AppLayout;
