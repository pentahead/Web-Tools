import { Link } from 'react-router-dom';
import { Layers } from 'lucide-react';
import ThemeToggle from '@/components/shared/ThemeToggle';

export default function Header() {
  return (
    <header className="h-16 border-b border-border bg-background flex items-center px-6 sticky top-0 z-50">
      <div className="flex items-center justify-between w-full max-w-[1200px] mx-auto">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Layers size={22} className="text-primary" />
          <h1 className="text-xl font-display font-semibold tracking-tight text-foreground">
            pentTools
          </h1>
        </Link>
        <nav className="flex items-center gap-6 md:gap-8 text-[14px] font-medium text-foreground/80">
          <Link to="/" className="hover:text-primary transition-colors font-display">Tools</Link>
          <a href="#" className="hover:text-primary transition-colors font-display">About</a>
          <ThemeToggle />
          <button className="bg-primary text-primary-foreground font-display font-semibold h-10 px-5 rounded-[8px] hover:bg-primary-hover transition-colors text-[14px]">
            Get Started
          </button>
        </nav>
      </div>
    </header>
  );
}
