import { Layers } from 'lucide-react';
import { useSectionNavigate } from '@/hooks/useSectionNavigate';

export default function Footer() {
  const scrollToSection = useSectionNavigate();

  return (
    <footer className="border-t border-border bg-background py-16 mt-auto">
      <div className="max-w-[1200px] mx-auto px-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <div className="flex flex-col items-start">
          <button 
            onClick={() => scrollToSection('top-section')}
            className="flex items-center gap-2 mb-3 hover:opacity-80 transition-opacity cursor-pointer text-left"
          >
            <Layers size={18} className="text-primary" />
            <h2 className="font-display font-semibold text-[15px] text-foreground tracking-tight">pentTools</h2>
          </button>
          <p className="text-muted-foreground text-sm font-light">
            Simple browser-based file tools. Private by design.
          </p>
        </div>

        <div className="flex flex-wrap gap-6 md:gap-8 text-[13px] font-medium text-muted-foreground font-display items-center">
          <button 
            onClick={() => scrollToSection('tools-section')} 
            className="hover:text-foreground transition-colors cursor-pointer"
          >
            Tools
          </button>
          <button 
            onClick={() => scrollToSection('tools-section')} 
            className="hover:text-foreground transition-colors cursor-pointer"
          >
            Get Started
          </button>
          <button 
            onClick={() => scrollToSection('top-section')} 
            className="hover:text-foreground transition-colors cursor-pointer"
          >
            About
          </button>
          <button 
            onClick={() => scrollToSection('top-section')} 
            className="hover:text-foreground transition-colors cursor-pointer"
          >
            Privacy
          </button>
          <a 
            href="https://github.com/pentahead" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="hover:text-foreground transition-colors"
          >
            GitHub
          </a>
        </div>
      </div>
      <div className="max-w-[1200px] mx-auto px-6 mt-12 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-[12px] text-muted-foreground/80 font-light">
          &copy; {new Date().getFullYear()} Pentahead Technologies. Private by design.
        </div>
        <div className="text-[12px] text-muted-foreground/80 font-light">
          Your files are processed locally in your browser.
        </div>
      </div>
    </footer>
  );
}
