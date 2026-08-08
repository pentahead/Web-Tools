import { Link } from 'react-router-dom';
import { Layers } from 'lucide-react';

export default function Header() {
  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 flex items-center px-6 bg-white dark:bg-slate-900 shrink-0 shadow-sm relative z-10">
      <div className="flex items-center justify-between w-full max-w-7xl mx-auto">
        <Link to="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="bg-blue-600 p-1.5 rounded-md text-white shadow-md">
            <Layers size={20} />
          </div>
          <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-700 to-blue-500 dark:from-blue-400 dark:to-blue-200">
            Vectorize
          </h1>
        </Link>
        <nav className="flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-400">
          <Link to="/" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Tools</Link>
          <a href="#" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">About</a>
        </nav>
      </div>
    </header>
  );
}
