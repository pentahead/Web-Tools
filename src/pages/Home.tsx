import { useState, useMemo } from 'react';
import { Search } from 'lucide-react';
import { tools } from '@/data/tools';
import ToolCard from '@/components/tools/ToolCard';

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');

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
      <div className="max-w-7xl mx-auto px-6 py-12 md:py-20">
        
        {/* Hero Section */}
        <section className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-6">
            Simple tools for your files
          </h1>
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 mb-10">
            Convert, optimize, and work with your files right in your browser.
          </p>
          
          <div className="relative max-w-xl mx-auto">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-11 pr-4 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-base shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all dark:text-white"
              placeholder="Search tools..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </section>

        {/* Tools Section */}
        <section>
          {filteredTools.length === 0 ? (
            <div className="text-center py-20">
              <h3 className="text-xl font-semibold text-slate-800 dark:text-slate-200 mb-2">No tools found.</h3>
              <p className="text-slate-500">Try another search term.</p>
            </div>
          ) : (
            <div className="space-y-16">
              {imageTools.length > 0 && (
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                    Image Tools
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {imageTools.map(tool => (
                      <ToolCard key={tool.id} tool={tool} />
                    ))}
                  </div>
                </div>
              )}
              
              {pdfTools.length > 0 && (
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                    PDF Tools
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
