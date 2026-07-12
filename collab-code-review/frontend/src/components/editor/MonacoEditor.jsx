import Editor from '@monaco-editor/react';
import { useRef, useCallback } from 'react';

/**
 * Maps our internal language identifiers to Monaco language IDs.
 */
const MONACO_LANGUAGE_MAP = {
  javascript:  'javascript',
  typescript:  'typescript',
  python:      'python',
  java:        'java',
  cpp:         'cpp',
  csharp:      'csharp',
  go:          'go',
  rust:        'rust',
  ruby:        'ruby',
  php:         'php',
  swift:       'swift',
  kotlin:      'kotlin',
  html:        'html',
  css:         'css',
  sql:         'sql',
  plaintext:   'plaintext',
};

/**
 * Default starter snippets shown when a room/session has no code yet.
 */
const DEFAULT_SNIPPETS = {
  javascript: `// JavaScript — start typing your code here
function greet(name) {
  return \`Hello, \${name}!\`;
}

console.log(greet('World'));
`,
  typescript: `// TypeScript — start typing your code here
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}

console.log(greet('World'));
`,
  python: `# Python — start typing your code here
def greet(name: str) -> str:
    return f"Hello, {name}!"

print(greet("World"))
`,
  java: `// Java — start typing your code here
public class Main {
    public static void main(String[] args) {
        System.out.println(greet("World"));
    }

    public static String greet(String name) {
        return "Hello, " + name + "!";
    }
}
`,
  cpp: `// C++ — start typing your code here
#include <iostream>
#include <string>

std::string greet(const std::string& name) {
    return "Hello, " + name + "!";
}

int main() {
    std::cout << greet("World") << std::endl;
    return 0;
}
`,
  go: `// Go — start typing your code here
package main

import "fmt"

func greet(name string) string {
    return fmt.Sprintf("Hello, %s!", name)
}

func main() {
    fmt.Println(greet("World"))
}
`,
  rust: `// Rust — start typing your code here
fn greet(name: &str) -> String {
    format!("Hello, {}!", name)
}

fn main() {
    println!("{}", greet("World"));
}
`,
  plaintext: `// Start typing your code here...`,
};

/**
 * MonacoEditor — a feature-rich wrapper around @monaco-editor/react.
 *
 * Props:
 *  - value         {string}   Current code content
 *  - onChange      {fn}       Called with new code string on every change
 *  - language      {string}   Language key (e.g. 'javascript', 'python')
 *  - readOnly      {boolean}  Disable editing (default: false)
 *  - height        {string}   CSS height (default: '100%')
 *  - onMount       {fn}       Receives (editor, monaco) after mount
 */
const MonacoEditor = ({
  value,
  onChange,
  language = 'javascript',
  readOnly = false,
  height = '100%',
  onMount,
}) => {
  const editorRef = useRef(null);
  const monacoLanguage = MONACO_LANGUAGE_MAP[language] || 'plaintext';

  const effectiveValue =
    value !== undefined && value !== null && value !== ''
      ? value
      : DEFAULT_SNIPPETS[language] || DEFAULT_SNIPPETS.plaintext;

  const handleMount = useCallback(
    (editor, monaco) => {
      editorRef.current = editor;

      // ── Monaco global theme override ────────────────────────────────────
      monaco.editor.defineTheme('collab-dark', {
        base: 'vs-dark',
        inherit: true,
        rules: [
          { token: 'comment',  foreground: '6b7280', fontStyle: 'italic' },
          { token: 'keyword',  foreground: 'a78bfa' },
          { token: 'string',   foreground: '6ee7b7' },
          { token: 'number',   foreground: 'fbbf24' },
          { token: 'type',     foreground: '67e8f9' },
          { token: 'function', foreground: '818cf8' },
        ],
        colors: {
          'editor.background':           '#0f172a',
          'editor.foreground':           '#e2e8f0',
          'editor.lineHighlightBackground': '#1e293b',
          'editor.selectionBackground':  '#4f46e540',
          'editorCursor.foreground':     '#818cf8',
          'editorLineNumber.foreground': '#475569',
          'editorLineNumber.activeForeground': '#818cf8',
          'editor.findMatchBackground':  '#4f46e580',
          'editorWidget.background':     '#1e293b',
          'editorWidget.border':         '#334155',
          'editorSuggestWidget.background': '#1e293b',
          'editorSuggestWidget.border':  '#334155',
          'editorSuggestWidget.selectedBackground': '#4f46e540',
          'scrollbar.shadow':            '#00000000',
          'scrollbarSlider.background':  '#47556940',
          'scrollbarSlider.hoverBackground': '#47556980',
        },
      });

      monaco.editor.setTheme('collab-dark');

      // ── Editor options fine-tuning ──────────────────────────────────────
      editor.updateOptions({
        tabSize: 2,
        insertSpaces: true,
        detectIndentation: false,
        wordWrap: 'on',
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        renderLineHighlight: 'gutter',
        padding: { top: 16, bottom: 16 },
        overviewRulerLanes: 0,
        scrollBeyondLastLine: false,
        folding: true,
        showFoldingControls: 'mouseover',
        bracketPairColorization: { enabled: true },
        guides: { bracketPairs: true, indentation: true },
        suggest: {
          showKeywords: true,
          showSnippets: true,
        },
      });

      onMount?.(editor, monaco);
    },
    [onMount]
  );

  const handleChange = useCallback(
    (val) => {
      onChange?.(val ?? '');
    },
    [onChange]
  );

  return (
    <Editor
      height={height}
      language={monacoLanguage}
      value={effectiveValue}
      onChange={handleChange}
      onMount={handleMount}
      options={{
        readOnly,
        fontSize: 13.5,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
        fontLigatures: true,
        lineNumbers: 'on',
        minimap: { enabled: true, scale: 0.8 },
        scrollbar: {
          vertical: 'auto',
          horizontal: 'auto',
          useShadows: false,
          verticalScrollbarSize: 6,
          horizontalScrollbarSize: 6,
        },
      }}
      loading={
        <div className="flex items-center justify-center h-full bg-surface-900">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-slate-400 text-xs font-mono">Loading editor…</span>
          </div>
        </div>
      }
    />
  );
};

export default MonacoEditor;
export { MONACO_LANGUAGE_MAP, DEFAULT_SNIPPETS };
