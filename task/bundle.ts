import fs from 'fs';
import path from 'path';

const files = [
  'types.ts',
  'constants.tsx',
  'lib/supabase.ts',
  'components/GeminiSummary.tsx',
  'components/AiWorkHub.tsx',
  'components/Sidebar.tsx',
  'components/views/TodayView.tsx',
  'components/views/PlannerView.tsx',
  'components/views/ScheduleView.tsx',
  'components/views/MetricsView.tsx',
  'components/views/HabitsView.tsx',
  'components/views/SettingsView.tsx',
  'components/views/InboxView.tsx',
  'components/views/ProjectDetailView.tsx',
  'App.tsx'
];

let externalImports = new Set<string>();
let combinedContent = '';

for (const file of files) {
  const filePath = path.join(process.cwd(), file);
  if (!fs.existsSync(filePath)) {
    console.error(`File not found: ${filePath}`);
    continue;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Extract external imports
  const importRegex = /^import\s+.*?\s+from\s+['"]([^'"]+)['"];?/gm;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    if (!match[1].startsWith('.')) {
      externalImports.add(match[0]);
    }
  }
  
  // Remove all imports
  content = content.replace(/^import\s+.*?\s+from\s+['"][^'"]+['"];?\n?/gm, '');
  
  // Remove export default except for App
  if (file !== 'App.tsx') {
    content = content.replace(/^export\s+default\s+\w+;?\n?/gm, '');
  }
  
  // Remove export keyword from declarations
  content = content.replace(/^export\s+(const|let|var|function|class|interface|type)\s+/gm, '$1 ');
  
  combinedContent += `\n// --- ${file} ---\n` + content;
}

// Combine external imports at the top
let reactImports = new Set<string>();
let otherImports = [];
for (const imp of externalImports) {
  if (imp.includes('from \'react\'') || imp.includes('from "react"')) {
    const match = imp.match(/import\s+(.*?)\s+from/);
    if (match) {
      const parts = match[1].replace(/[{}]/g, '').split(',').map(s => s.trim());
      parts.forEach(p => {
        if (p) reactImports.add(p);
      });
    }
  } else {
    otherImports.push(imp);
  }
}

let reactImportStr = '';
if (reactImports.size > 0) {
  const defaultImports = [];
  const namedImports = [];
  for (const imp of reactImports) {
    if (imp === 'React') defaultImports.push(imp);
    else namedImports.push(imp);
  }
  
  reactImportStr = 'import ';
  if (defaultImports.length > 0) {
    reactImportStr += defaultImports.join(', ');
    if (namedImports.length > 0) reactImportStr += ', ';
  }
  if (namedImports.length > 0) {
    reactImportStr += `{ ${namedImports.join(', ')} }`;
  }
  reactImportStr += " from 'react';\n";
}

const finalContent = reactImportStr + otherImports.join('\n') + '\n' + combinedContent;

fs.writeFileSync(path.join(process.cwd(), 'AppCombined.tsx'), finalContent, 'utf8');
console.log('Combined into AppCombined.tsx');
