import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex flex-col items-center md:items-start">
          <h2 className="font-bold text-lg text-slate-800 dark:text-slate-200 mb-2">Vectorize</h2>
          <p className="text-slate-500 text-sm text-center md:text-left">
            Simple browser-based file tools.
          </p>
        </div>
        
        <div className="flex gap-6 text-sm font-medium text-slate-600 dark:text-slate-400">
          <Link to="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Tools</Link>
          <a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Privacy</a>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">GitHub</a>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 mt-8 pt-8 border-t border-slate-200/50 dark:border-slate-800/50 text-center text-xs text-slate-400">
        &copy; {new Date().getFullYear()} Vectorize. Private by design. Your files are processed locally in your browser.
      </div>
    </footer>
  );
}
