import { useEffect, useRef } from 'react';

/**
 * AiReviewOverlay — renders visual highlights, squiggly underlines,
 * and hover tooltips for lines that have AI-identified bugs/smells.
 *
 * Props:
 *  - editorRef     {React.MutableRefObject}  Monaco editor instance
 *  - monacoRef     {React.MutableRefObject}  Monaco namespace
 *  - review        {Object}                  The LLM review object
 */
const AiReviewOverlay = ({ editorRef, monacoRef, review }) => {
  const decorationsRef = useRef([]);

  useEffect(() => {
    const editor = editorRef?.current;
    const monaco = monacoRef?.current;
    if (!editor || !monaco || !review) return;

    // Inject styles once
    const styleId = 'monaco-ai-review-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        .ai-high-severity-squiggly {
          border-bottom: 2px dashed #ef4444 !important;
          background: rgba(239, 68, 68, 0.05) !important;
        }
        .ai-medium-severity-squiggly {
          border-bottom: 2px dashed #f97316 !important;
          background: rgba(249, 115, 22, 0.05) !important;
        }
        .ai-low-severity-squiggly {
          border-bottom: 2px dashed #eab308 !important;
          background: rgba(234, 179, 8, 0.03) !important;
        }
      `;
      document.head.appendChild(style);
    }

    const decorations = [];

    // Helper to get severity style
    const getSeverityClass = (sev) => {
      if (sev === 'high') return 'ai-high-severity-squiggly';
      if (sev === 'medium') return 'ai-medium-severity-squiggly';
      return 'ai-low-severity-squiggly';
    };

    const getRulerColor = (sev) => {
      if (sev === 'high') return '#ef4444';
      if (sev === 'medium') return '#f97316';
      return '#eab308';
    };

    // 1. Process Bugs
    if (review.bugs && Array.isArray(review.bugs)) {
      review.bugs.forEach((bug) => {
        const line = Number(bug.line);
        if (!line || isNaN(line)) return;

        decorations.push({
          range: new monaco.Range(line, 1, line, 100),
          options: {
            isWholeLine: false,
            className: getSeverityClass(bug.severity),
            hoverMessage: [
              { value: `### 🐛 AI Bug detected (Severity: ${bug.severity.toUpperCase()})` },
              { value: `${bug.issue}` }
            ],
            overviewRuler: {
              color: getRulerColor(bug.severity),
              position: monaco.editor.OverviewRulerLane.Right,
            },
          },
        });
      });
    }

    // 2. Process Security Issues
    if (review.securityIssues && Array.isArray(review.securityIssues)) {
      review.securityIssues.forEach((issue) => {
        const line = Number(issue.line);
        if (!line || isNaN(line)) return;

        decorations.push({
          range: new monaco.Range(line, 1, line, 100),
          options: {
            isWholeLine: false,
            className: getSeverityClass(issue.severity),
            hoverMessage: [
              { value: `### 🛡️ AI Security Threat (Severity: ${issue.severity?.toUpperCase() || 'HIGH'})` },
              { value: `${issue.issue}` }
            ],
            overviewRuler: {
              color: getRulerColor(issue.severity || 'high'),
              position: monaco.editor.OverviewRulerLane.Right,
            },
          },
        });
      });
    }

    // 3. Process Code Smells
    if (review.codeSmells && Array.isArray(review.codeSmells)) {
      review.codeSmells.forEach((smell) => {
        const line = Number(smell.line);
        if (!line || isNaN(line)) return;

        decorations.push({
          range: new monaco.Range(line, 1, line, 100),
          options: {
            isWholeLine: false,
            className: 'ai-low-severity-squiggly',
            hoverMessage: [
              { value: `### 💡 AI Code Smell` },
              { value: `**Issue:** ${smell.issue}` },
              { value: `**Suggestion:** ${smell.suggestion}` }
            ],
            overviewRuler: {
              color: '#eab308',
              position: monaco.editor.OverviewRulerLane.Right,
            },
          },
        });
      });
    }

    // Apply decorations
    const newDecorations = editor.deltaDecorations(decorationsRef.current, decorations);
    decorationsRef.current = newDecorations;
  }, [review, editorRef, monacoRef]);

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

export default AiReviewOverlay;
