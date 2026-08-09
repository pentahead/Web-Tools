import { Link } from 'react-router-dom';
import { Layers } from 'lucide-react';
import ThemeToggle from '@/components/shared/ThemeToggle';
import { useSectionNavigate } from '@/hooks/useSectionNavigate';

export default function Header() {
  const scrollToSection = useSectionNavigate();

  return (
    <header className="h-16 border-b border-border bg-background flex items-center px-4 sm:px-6 sticky top-0 z-50">
      <div className="flex items-center justify-between w-full max-w-[1200px] mx-auto">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <Layers size={22} className="text-primary" />
          <h1 className="text-xl font-display font-semibold tracking-tight text-foreground">
            pentTools
          </h1>
        </Link>
        <nav className="flex items-center gap-3 sm:gap-6 md:gap-8 text-[14px] font-medium text-foreground/80">
          <button 
            onClick={() => scrollToSection('tools-section')} 
            className="hover:text-primary transition-colors font-display cursor-pointer"
          >
            Tools
          </button>
          <button 
            onClick={() => scrollToSection('top-section')} 
            className="hover:text-primary transition-colors font-display cursor-pointer"
          >
            About
          </button>
          <ThemeToggle />
          <button 
            onClick={() => scrollToSection('tools-section')} 
            className="bg-primary text-primary-foreground font-display font-semibold h-10 px-4 sm:px-5 rounded-[8px] hover:bg-primary-hover transition-colors text-[13px] sm:text-[14px] cursor-pointer"
          >
            Get Started
          </button>
        </nav>
      </div>
    </header>
  );
}
