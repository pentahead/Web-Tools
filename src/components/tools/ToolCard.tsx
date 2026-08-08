import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { Tool } from '@/types/tools';

export default function ToolCard({ tool }: { tool: Tool }) {
  const isAvailable = tool.status === 'available';
  const Icon = tool.icon;

  const content = (
    <>
      <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg w-fit mb-4">
        <Icon className={cn("w-6 h-6", isAvailable ? "text-blue-600 dark:text-blue-400" : "text-slate-400")} />
      </div>
      
      <h3 className={cn("font-semibold text-lg mb-2", !isAvailable && "text-slate-500")}>
        {tool.name}
      </h3>
      
      <p className="text-slate-500 dark:text-slate-400 text-sm mb-6 flex-1">
        {tool.description}
      </p>

      {isAvailable ? (
        <div className="flex items-center text-blue-600 dark:text-blue-400 font-medium text-sm mt-auto group-hover:underline">
          Open Tool &rarr;
        </div>
      ) : (
        <div className="inline-flex items-center bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold px-2.5 py-1 rounded-full mt-auto w-fit">
          Coming Soon
        </div>
      )}
    </>
  );

  const cardClasses = cn(
    "flex flex-col p-6 rounded-xl border bg-white dark:bg-slate-900 transition-all duration-300 h-full",
    isAvailable 
      ? "border-slate-200 dark:border-slate-800 hover:border-blue-300 hover:shadow-md group cursor-pointer" 
      : "border-slate-200/50 dark:border-slate-800/50 opacity-80 grayscale-[0.5]"
  );

  if (isAvailable && tool.href) {
    return (
      <Link to={tool.href} className={cardClasses}>
        {content}
      </Link>
    );
  }

  return (
    <div className={cardClasses}>
      {content}
    </div>
  );
}
