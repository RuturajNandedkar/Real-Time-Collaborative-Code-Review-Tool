import { useEffect, useRef } from 'react';

/**
 * CommentOverlay — renders visual highlights and overview ruler indicators
 * for lines in the editor that have comments.
 *
 * Props:
 *  - editorRef     {React.MutableRefObject}  Monaco editor instance
 *  - monacoRef     {React.MutableRefObject}  Monaco namespace
 *  - comments      {Array}  List of comments
 */
const CommentOverlay = ({ editorRef, monacoRef, comments }) => {
  const decorationsRef = useRef([]);

  useEffect(() => {
    const editor = editorRef?.current;
    const monaco = monacoRef?.current;
    if (!editor || !monaco) return;

    // Inject styles once
    const styleId = 'monaco-comment-overlay-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        .comment-line-highlight {
          background: rgba(99, 102, 241, 0.08) !important;
          border-left: 3px solid #6366f1 !important;
        }
        .comment-resolved-line-highlight {
          background: rgba(16, 185, 129, 0.04) !important;
          border-left: 3px solid rgba(16, 185, 129, 0.5) !important;
        }
      `;
      document.head.appendChild(style);
    }

    // Build decorations
    const decorations = [];

    // Track line numbers we already decorated to avoid duplicates on the same line
    const decoratedLines = new Set();

    comments.forEach((c) => {
      if (!c.lineNumber) return;
      const line = c.lineNumber;

      // Group highlights per line (unresolved comments take priority)
      if (decoratedLines.has(line)) return;
      decoratedLines.add(line);

      // Find if there is any unresolved comment on this line
      const hasUnresolved = comments.some(other => other.lineNumber === line && !other.resolved);

      decorations.push({
        range: new monaco.Range(line, 1, line, 1),
        options: {
          isWholeLine: true,
          className: hasUnresolved ? 'comment-line-highlight' : 'comment-resolved-line-highlight',
          overviewRuler: {
            color: hasUnresolved ? '#6366f1' : '#10b981',
            position: monaco.editor.OverviewRulerLane.Left,
          },
        },
      });
    });

    // Apply decorations
    const newDecorations = editor.deltaDecorations(decorationsRef.current, decorations);
    decorationsRef.current = newDecorations;
  }, [comments, editorRef, monacoRef]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const editor = editorRef?.current;
      if (editor && decorationsRef.current.length > 0) {
        editor.deltaDecorations(decorationsRef.current, []);
      }
    };
  }, []);

  return null;
};

export default CommentOverlay;
