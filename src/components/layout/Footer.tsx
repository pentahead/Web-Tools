import { Link } from 'react-router-dom';
import { Layers } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="border-t border-border bg-background py-16 mt-auto">
      <div className="max-w-[1200px] mx-auto px-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
        <div className="flex flex-col items-start">
          <div className="flex items-center gap-2 mb-3">
            <Layers size={18} className="text-primary" />
            <h2 className="font-display font-semibold text-[15px] text-foreground tracking-tight">pentTools</h2>
          </div>
          <p className="text-muted-foreground text-sm font-light">
            Simple browser-based file tools.
          </p>
        </div>

        <div className="flex gap-8 text-[13px] font-medium text-muted-foreground font-display">
          <Link to="/" className="hover:text-foreground transition-colors">Tools</Link>
          <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
          <a href="https://github.com/pentahead" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">GitHub</a>
        </div>
      </div>
      <div className="max-w-[1200px] mx-auto px-6 mt-12 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="text-[12px] text-muted-foreground/80 font-light">
          &copy; {new Date().getFullYear()} pentTools. Private by design.
        </div>
        <div className="text-[12px] text-muted-foreground/80 font-light">
          Your files are processed locally in your browser.
        </div>
      </div>
    </footer>
  );
}
