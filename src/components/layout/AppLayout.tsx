import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      <Header />
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
