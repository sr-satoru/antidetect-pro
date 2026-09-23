import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from '@/components/ui/sidebar';
import { Header } from '@/components/ui/header';

export const AppLayout: React.FC = () => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#08090C] text-[#F4F4F6]">
      {/* Sidebar global */}
      <Sidebar />

      {/* Main viewport */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">
        {/* Header superior */}
        <Header />

        {/* Content area */}
        <main className="flex-1 overflow-hidden p-3.5 sm:p-5 bg-[#08090C]">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
