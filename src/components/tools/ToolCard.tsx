import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import type { Tool } from '@/types/tools';

export default function ToolCard({ tool }: { tool: Tool }) {
  const isAvailable = tool.status === 'available';
  const Icon = tool.icon;

  const content = (
    <>
      <div className="flex items-center justify-between gap-2 mb-4">
        <Icon className={cn("w-6 h-6", isAvailable ? "text-foreground" : "text-muted-foreground")} strokeWidth={1.5} />
        {!isAvailable && (
          <span className="font-display text-[9.5px] font-semibold tracking-widest uppercase border border-border rounded px-[6px] py-[3px] text-muted-foreground leading-none">
            Soon
          </span>
        )}
      </div>
      
      <h3 className={cn("font-display font-semibold text-[22px] tracking-tight leading-tight mb-2", !isAvailable ? "text-secondary-foreground/60" : "text-foreground")}>
        {tool.name}
      </h3>
      
      <p className="text-[14px] font-light leading-relaxed text-muted-foreground mb-4 flex-1">
        {tool.description}
      </p>

      {isAvailable ? (
        <div className="font-display font-medium text-[13px] text-foreground mt-auto">
          app.penttools.com <span className="text-primary group-hover:underline inline-block ml-1">&rarr;</span>
        </div>
      ) : (
        <div className="font-display font-medium text-[13px] text-muted-foreground mt-auto">
          In development
        </div>
      )}
    </>
  );

  const cardClasses = cn(
    "flex flex-col p-7 rounded-[11px] border bg-card transition-all duration-150 h-full text-left",
    isAvailable 
      ? "border-border hover:border-foreground hover:-translate-y-[2px] hover:shadow-[0_4px_20px_rgba(0,0,0,0.06)] group cursor-pointer" 
      : "border-transparent bg-secondary opacity-80"
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
