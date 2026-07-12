import { useEffect, useRef } from 'react';

/**
 * CursorOverlay — renders remote user cursors inside a Monaco Editor.
 *
 * Props:
 *  - editorRef       {React.MutableRefObject}  Monaco editor instance
 *  - monacoRef       {React.MutableRefObject}  Monaco namespace (from onMount)
 *  - remoteCursors   {Object}  Map of socketId → { cursor, username, color }
 */
const CursorOverlay = ({ editorRef, monacoRef, remoteCursors }) => {
  // Track decoration IDs so we can clear them on next render
  const decorationsRef = useRef({});   // socketId → string[] (decorationIds)

  useEffect(() => {
    const editor = editorRef?.current;
    const monaco = monacoRef?.current;
    if (!editor || !monaco) return;

    const model = editor.getModel();
    if (!model) return;

    const nextDecorations = {};

    Object.entries(remoteCursors).forEach(([socketId, info]) => {
      if (!info?.cursor) return;
      const { lineNumber, column, selection } = info.cursor;
      const { username, color } = info;

      // ── CSS class names injected via style tag ───────────────────────────
      const cursorClass = `remote-cursor-${socketId.slice(-6)}`;
      const labelClass = `remote-cursor-label-${socketId.slice(-6)}`;

      // Inject dynamic CSS only once per socketId
      if (!document.getElementById(cursorClass)) {
        const style = document.createElement('style');
        style.id = cursorClass;
        style.textContent = `
          .${cursorClass} {
            border-left: 2px solid ${color};
            position: relative;
          }
          .${cursorClass}::before {
            content: '';
            position: absolute;
            top: 0;
            left: -1px;
            width: 2px;
            height: 100%;
            background: ${color};
            opacity: 0.9;
          }
          .${labelClass} {
            background: ${color};
            color: #fff;
            font-size: 10px;
            font-family: 'Inter', sans-serif;
            padding: 1px 5px;
            border-radius: 3px;
            white-space: nowrap;
            pointer-events: none;
            z-index: 100;
          }
        `;
        document.head.appendChild(style);
      }

      const decorations = [];

      // Cursor line decoration
      decorations.push({
        range: new monaco.Range(lineNumber, column, lineNumber, column),
        options: {
          className: cursorClass,
          beforeContentClassName: undefined,
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        },
      });

      // Username label above the cursor
      decorations.push({
        range: new monaco.Range(lineNumber, column, lineNumber, column),
        options: {
          before: {
            content: username,
            inlineClassName: labelClass,
          },
        },
      });

      // Selection highlight (if user has text selected)
      if (selection && selection.startLineNumber !== selection.endLineNumber ||
          (selection && selection.startColumn !== selection.endColumn)) {
        decorations.push({
          range: new monaco.Range(
            selection.startLineNumber,
            selection.startColumn,
            selection.endLineNumber,
            selection.endColumn
          ),
          options: {
            className: '',
            inlineClassName: '',
            isWholeLine: false,
            overviewRuler: { color, position: monaco.editor.OverviewRulerLane.Right },
          },
        });
      }

      // Apply decorations, replacing previous ones for this user
      const prevIds = decorationsRef.current[socketId] || [];
      const newIds = editor.deltaDecorations(prevIds, decorations);
      nextDecorations[socketId] = newIds;
    });

    // Remove decorations for users who left
    Object.keys(decorationsRef.current).forEach((socketId) => {
      if (!remoteCursors[socketId]) {
        editor.deltaDecorations(decorationsRef.current[socketId], []);
      }
    });

    decorationsRef.current = nextDecorations;
  }, [remoteCursors, editorRef, monacoRef]);

  // Cleanup all decorations on unmount
  useEffect(() => {
    return () => {
      const editor = editorRef?.current;
      if (!editor) return;
      Object.values(decorationsRef.current).forEach((ids) => {
        editor.deltaDecorations(ids, []);
      });
      decorationsRef.current = {};
    };
  }, []);

  return null; // purely imperative — no DOM rendered
};

export default CursorOverlay;
