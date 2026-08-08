import type { ReactNode } from 'react';

export default function PdfWorkspace({
  title,
  description,
  sidebar,
  children
}: {
  title: string;
  description: string;
  sidebar: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-slate-50 dark:bg-slate-950">
      <div className="flex-1 p-6 flex flex-col overflow-y-auto">
        <div className="mb-6 flex items-center gap-3">
          <div className="bg-blue-600 p-2 rounded-lg text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{title}</h2>
            <p className="text-sm text-slate-500">{description}</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          {children}
        </div>
      </div>

      <aside className="w-full lg:w-80 border-t lg:border-t-0 lg:border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col overflow-y-auto shrink-0 z-20 shadow-[-4px_0_15px_-3px_rgba(0,0,0,0.02)]">
        {sidebar}
      </aside>
    </div>
  );
}
