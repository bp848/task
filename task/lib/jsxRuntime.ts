/**
 * JSX Runtime Engine
 * ペーストされたJSXコードをブラウザ上でトランスパイル＆実行し、
 * Reactコンポーネントとして返す。
 */
import { transform } from 'sucrase';
import React from 'react';
import * as LucideIcons from 'lucide-react';

// JSXコードに注入する依存ライブラリ
const AVAILABLE_LIBS: Record<string, unknown> = {
  'react': React,
  'lucide-react': LucideIcons,
};

export interface CustomToolMeta {
  id: string;
  name: string;
  description: string;
  icon: string;
  tags: string[];
  category: 'productivity' | 'developer' | 'utility' | 'communication';
  jsxSource: string;
  createdAt: number;
}

const STORAGE_KEY = 'zenwork_custom_tools';

/**
 * JSXソースコードをReactコンポーネントに変換
 */
export function compileJSX(jsxSource: string): React.FC {
  // import文を除去し、使用されているモジュールを特定
  const importRegex = /import\s+(?:(\{[^}]+\})|(\w+))(?:\s*,\s*(?:(\{[^}]+\})|(\w+)))?\s+from\s+["']([^"']+)["'];?\n?/g;
  const imports: { names: string[]; defaultName: string | null; module: string }[] = [];

  let cleanSource = jsxSource.replace(importRegex, (_match, named1, default1, named2, default2, modulePath) => {
    const names: string[] = [];
    const defaultName = default1 || default2 || null;

    for (const namedGroup of [named1, named2]) {
      if (namedGroup) {
        const extracted = namedGroup.replace(/[{}]/g, '').split(',').map((s: string) => s.trim()).filter(Boolean);
        names.push(...extracted);
      }
    }
    imports.push({ names, defaultName, module: modulePath });
    return '';
  });

  // export default を除去してコンポーネント名を取得
  let componentName = 'App';
  cleanSource = cleanSource.replace(/export\s+default\s+(?:function\s+)?(\w+)/g, (_m, name) => {
    componentName = name;
    return `/* exported: ${name} */`;
  });

  // JSX → JS トランスパイル
  const { code: transpiledCode } = transform(cleanSource, {
    transforms: ['jsx', 'typescript'],
    jsxRuntime: 'classic',
    jsxPragma: 'React.createElement',
    jsxFragmentPragma: 'React.Fragment',
  });

  // 依存ライブラリの変数を構築
  const scopeVars: Record<string, unknown> = { React };

  for (const imp of imports) {
    const lib = AVAILABLE_LIBS[imp.module];
    if (!lib) continue;

    if (imp.defaultName) {
      scopeVars[imp.defaultName] = lib;
    }
    if (imp.names.length > 0) {
      const libObj = lib as Record<string, unknown>;
      for (const name of imp.names) {
        // handle "X as Y" syntax
        const parts = name.split(/\s+as\s+/);
        const originalName = parts[0].trim();
        const aliasName = (parts[1] || parts[0]).trim();
        if (libObj[originalName] !== undefined) {
          scopeVars[aliasName] = libObj[originalName];
        }
      }
    }
  }

  // React hooks を直接スコープに入れる
  const reactHooks = ['useState', 'useEffect', 'useRef', 'useCallback', 'useMemo', 'useReducer', 'useContext', 'useLayoutEffect', 'memo', 'forwardRef', 'createContext', 'Fragment'] as const;
  for (const hook of reactHooks) {
    if ((React as Record<string, unknown>)[hook]) {
      scopeVars[hook] = (React as Record<string, unknown>)[hook];
    }
  }

  // Function で実行
  const paramNames = Object.keys(scopeVars);
  const paramValues = paramNames.map(k => scopeVars[k]);

  const wrappedCode = `
    ${transpiledCode}
    return typeof ${componentName} !== 'undefined' ? ${componentName} : null;
  `;

  try {
    const factory = new Function(...paramNames, wrappedCode);
    const Component = factory(...paramValues);
    if (typeof Component === 'function') {
      return Component as React.FC;
    }
    throw new Error(`コンポーネント "${componentName}" が見つかりません`);
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    // エラー表示コンポーネントを返す
    const ErrorComponent: React.FC = () =>
      React.createElement('div', {
        style: { padding: 20, color: '#dc2626', background: '#fef2f2', borderRadius: 12, fontSize: 13 }
      },
        React.createElement('p', { style: { fontWeight: 700, marginBottom: 8 } }, 'JSX コンパイルエラー'),
        React.createElement('pre', { style: { whiteSpace: 'pre-wrap', fontSize: 11, color: '#991b1b' } }, errorMsg)
      );
    return ErrorComponent;
  }
}

/**
 * localStorage からカスタムツール一覧を読み込み
 */
export function loadCustomTools(): CustomToolMeta[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

/**
 * カスタムツールを保存
 */
export function saveCustomTool(tool: CustomToolMeta): void {
  const tools = loadCustomTools();
  const idx = tools.findIndex(t => t.id === tool.id);
  if (idx >= 0) {
    tools[idx] = tool;
  } else {
    tools.push(tool);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tools));
}

/**
 * カスタムツールを削除
 */
export function deleteCustomTool(id: string): void {
  const tools = loadCustomTools().filter(t => t.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tools));
}
