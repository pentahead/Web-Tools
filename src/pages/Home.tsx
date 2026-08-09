import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Search } from 'lucide-react';
import { tools } from '@/data/tools';
import ToolCard from '@/components/tools/ToolCard';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();

  useEffect(() => {
    if (location.hash) {
      const sectionId = location.hash.replace('#', '');
      if (sectionId === 'top-section' || sectionId === 'top') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        const el = document.getElementById(sectionId);
        if (el) {
          setTimeout(() => {
            el.scrollIntoView({ behavior: 'smooth' });
          }, 50);
        }
      }
    }
  }, [location.hash]);

  const filteredTools = useMemo(() => {
    if (!searchQuery.trim()) return tools;
    const query = searchQuery.toLowerCase();
    return tools.filter(tool => 
      tool.name.toLowerCase().includes(query) || 
      tool.description.toLowerCase().includes(query) ||
      tool.category.toLowerCase().includes(query)
    );
  }, [searchQuery]);

  const imageTools = filteredTools.filter(t => t.category === 'image');
  const pdfTools = filteredTools.filter(t => t.category === 'pdf');

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="w-full py-16 md:py-24 px-6 md:px-12">
        
        {/* Hero Section (About & Privacy overview) */}
        <section id="top-section" className="mb-20 max-w-2xl scroll-mt-20">
          <h1 className="text-[clamp(34px,5vw,56px)] font-light leading-[1.05] tracking-[-0.02em] text-foreground mb-6">
            Files shouldn't be <em className="not-italic bg-primary text-black px-2 rounded-md font-normal">hard</em>.
          </h1>
          <p className="text-[18px] font-light leading-[1.55] text-muted-foreground mb-10 max-w-[640px]">
            <b>pentTools</b> runs localized software modules to optimize, convert, and manipulate your files. Private by design, executed directly in your browser.
          </p>
          
          <div className="relative max-w-lg">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-[18px] w-[18px] text-muted-foreground" />
            </div>
            <input
              type="text"
              className="block w-full pl-11 pr-4 py-[14px] bg-card border border-border rounded-lg text-[15px] shadow-sm focus:border-foreground focus:ring-0 outline-none transition-colors"
              placeholder="Search product line..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </section>

        {/* Tools Section */}
        <section id="tools-section" className="border-t border-border pt-16 scroll-mt-20">
          <span className="font-display text-[11px] font-semibold tracking-[0.1em] uppercase text-muted-foreground block mb-8">
            Product Line
          </span>

          {filteredTools.length === 0 ? (
            <div className="py-12">
              <h3 className="font-display text-xl font-medium text-foreground mb-2">No active modules found.</h3>
              <p className="text-[14px] text-muted-foreground">Adjust your search parameters.</p>
            </div>
          ) : (
            <div className="space-y-16">
              {imageTools.length > 0 && (
                <div>
                  <h2 className="font-display text-[24px] font-medium tracking-[-0.01em] text-foreground mb-6">
                    Image Tools
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {imageTools.map(tool => (
                      <ToolCard key={tool.id} tool={tool} />
                    ))}
                  </div>
                </div>
              )}
              
              {pdfTools.length > 0 && (
                <div className="pt-8">
                  <h2 className="font-display text-[24px] font-medium tracking-[-0.01em] text-foreground mb-6">
                    PDF Tools
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {pdfTools.map(tool => (
                      <ToolCard key={tool.id} tool={tool} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
        
      </div>
    </div>
  );
}
