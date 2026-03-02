import fs from 'fs';
import path from 'path';

const colorMap: Record<string, string> = {
  'slate-50': 'zinc-50',
  'slate-100': 'zinc-100',
  'slate-200': 'zinc-200',
  'slate-300': 'zinc-300',
  'slate-400': 'zinc-400',
  'slate-500': 'zinc-500',
  'slate-600': 'zinc-600',
  'slate-700': 'zinc-700',
  'slate-800': 'zinc-800',
  'slate-900': 'zinc-900',
  'slate-950': 'zinc-950',
};

function processDirectory(dir: string) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.css')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let changed = false;
      
      // Replace colors
      for (const [oldColor, newColor] of Object.entries(colorMap)) {
        const regex = new RegExp(`\\b${oldColor}\\b`, 'g');
        if (regex.test(content)) {
          content = content.replace(regex, newColor);
          changed = true;
        }
      }

      if (changed) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated ${fullPath}`);
      }
    }
  }
}

processDirectory(path.join(process.cwd(), 'components'));

const appPath = path.join(process.cwd(), 'App.tsx');
if (fs.existsSync(appPath)) {
  let content = fs.readFileSync(appPath, 'utf8');
  let changed = false;
  for (const [oldColor, newColor] of Object.entries(colorMap)) {
    const regex = new RegExp(`\\b${oldColor}\\b`, 'g');
    if (regex.test(content)) {
      content = content.replace(regex, newColor);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(appPath, content, 'utf8');
    console.log(`Updated App.tsx`);
  }
}
const cssPath = path.join(process.cwd(), 'index.css');
if (fs.existsSync(cssPath)) {
  let content = fs.readFileSync(cssPath, 'utf8');
  let changed = false;
  for (const [oldColor, newColor] of Object.entries(colorMap)) {
    const regex = new RegExp(`\\b${oldColor}\\b`, 'g');
    if (regex.test(content)) {
      content = content.replace(regex, newColor);
      changed = true;
    }
  }
  if (changed) {
    fs.writeFileSync(cssPath, content, 'utf8');
    console.log(`Updated index.css`);
  }
}
