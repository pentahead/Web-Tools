const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Replace worker path
code = code.replace('./workers/vectorizer.worker.ts', '../../workers/vectorizer.worker.ts');

// Rename App to ImageToSvg
code = code.replace('export default function App() {', 'export default function ImageToSvg() {');

// Remove the outer div and header
// Match from <div className="min-h-screen... up to </header>
code = code.replace(/<div className="min-h-screen[^>]+>[\s\S]*?<header[^>]+>[\s\S]*?<\/header>/, '<>');

// Replace the last closing </div> with </>
code = code.replace(/<\/div>\s*\)\;\s*\}\s*$/, '</>\n  );\n}\n');

fs.mkdirSync('src/pages/tools', { recursive: true });
fs.writeFileSync('src/pages/tools/ImageToSvg.tsx', code);
