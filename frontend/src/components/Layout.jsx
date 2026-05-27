import { useState } from 'react';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar.jsx';

export default function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar móvil */}
        <header className="lg:hidden sticky top-0 z-20 bg-white/85 backdrop-blur border-b border-sage/10 px-4 py-3 flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)} className="p-2 -ml-2 text-sage">
            <Menu size={22} />
          </button>
          <h1 className="font-display text-lg font-bold text-stone-800">HilosApp</h1>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1400px] w-full mx-auto">
          {children}
        </main>

        <footer className="border-t border-sage/10 py-4 text-center text-xs text-stone-500">
          HilosApp · SQLite + MongoDB · {new Date().getFullYear()}
        </footer>
      </div>
    </div>
  );
}
