import type { ReactNode } from 'react';
import { FileText } from 'lucide-react';

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
    <div className="flex-1 flex flex-col lg:flex-row overflow-hidden bg-background">
      <div className="flex-1 p-8 md:p-12 flex flex-col overflow-y-auto">
        <div className="mb-8 flex items-center gap-4">
          <div className="bg-primary p-3 rounded-lg text-primary-foreground shadow-sm">
            <FileText size={28} strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-3xl font-display font-medium tracking-tight text-foreground mb-1">{title}</h2>
            <p className="text-[15px] font-light text-muted-foreground">{description}</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          {children}
        </div>
      </div>

      <aside className="w-full lg:w-[340px] border-t lg:border-t-0 lg:border-l border-border bg-card flex flex-col overflow-y-auto shrink-0 z-20">
        {sidebar}
      </aside>
    </div>
  );
}
