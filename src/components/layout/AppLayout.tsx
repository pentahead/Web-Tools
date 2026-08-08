import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-body">
      <Header />
      <main className="flex-1 flex flex-col relative w-full max-w-[1200px] mx-auto">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
