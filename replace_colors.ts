import fs from 'fs';
import path from 'path';

const colorMap: Record<string, string> = {
  'rose-50': 'zinc-50',
  'rose-100': 'zinc-100',
  'rose-200': 'zinc-200',
  'rose-300': 'zinc-300',
  'rose-400': 'zinc-400',
  'rose-500': 'zinc-800',
  'rose-600': 'zinc-900',
  'rose-700': 'zinc-900',
  'rose-800': 'zinc-900',
  'rose-900': 'zinc-950',

  'indigo-50': 'zinc-100',
  'indigo-100': 'zinc-200',
  'indigo-200': 'zinc-300',
  'indigo-300': 'zinc-400',
  'indigo-400': 'zinc-500',
  'indigo-500': 'zinc-800',
  'indigo-600': 'zinc-900',
  'indigo-700': 'zinc-900',
  'indigo-800': 'zinc-900',
  'indigo-900': 'zinc-950',

  'emerald-50': 'zinc-100',
  'emerald-100': 'zinc-200',
  'emerald-200': 'zinc-300',
  'emerald-300': 'zinc-400',
  'emerald-400': 'zinc-500',
  'emerald-500': 'zinc-700',
  'emerald-600': 'zinc-800',

  'blue-50': 'zinc-100',
  'blue-500': 'zinc-700',

  'purple-50': 'zinc-100',
  'purple-500': 'zinc-700',
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
