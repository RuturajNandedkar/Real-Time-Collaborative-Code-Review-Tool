import { useState } from 'react';
import {
  Sparkles, ShieldAlert, Bug, HelpCircle, Eye,
  ChevronRight, CircleSlash, RefreshCw, X, AlertTriangle
} from 'lucide-react';

const AiReviewSummarySidebar = ({ review, onSelectLine, onReRun, isPending, onClose }) => {
  const [activeTab, setActiveTab] = useState('summary');

  if (!review) return null;

  const { bugs = [], codeSmells = [], securityIssues = [], overallQualityScore = 100 } = review;
  const totalIssues = bugs.length + codeSmells.length + securityIssues.length;

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-500 border-emerald-500 dark:text-emerald-400';
    if (score >= 50) return 'text-amber-500 border-amber-500 dark:text-amber-400';
    return 'text-red-500 border-red-500 dark:text-red-400';
  };

  const getScoreBg = (score) => {
    if (score >= 80) return 'bg-emerald-50 dark:bg-emerald-950/20';
    if (score >= 50) return 'bg-amber-50 dark:bg-amber-950/20';
    return 'bg-red-50 dark:bg-red-950/20';
  };

  const getSeverityBadge = (sev) => {
    if (sev === 'high') return 'bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-400';
    if (sev === 'medium') return 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400';
    return 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-400';
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-surface-800 border-l border-slate-200 dark:border-slate-700 w-80 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-700/60 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-500 animate-pulse" />
          <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            AI Code Review
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={onReRun}
            disabled={isPending}
            className="btn-ghost p-1 text-slate-400 hover:text-brand-500 disabled:opacity-50"
            title="Re-run review"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isPending ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={onClose} className="btn-ghost p-1 text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 dark:border-slate-700/40 text-xs font-semibold flex-shrink-0">
        <button
          onClick={() => setActiveTab('summary')}
          className={`flex-1 py-2 text-center border-b-2 transition-all ${
            activeTab === 'summary'
              ? 'border-brand-500 text-brand-500'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Score
        </button>
        <button
          onClick={() => setActiveTab('issues')}
          className={`flex-1 py-2 text-center border-b-2 transition-all flex items-center justify-center gap-1 ${
            activeTab === 'issues'
              ? 'border-brand-500 text-brand-500'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Issues
          {totalIssues > 0 && (
            <span className="bg-slate-100 dark:bg-surface-700 text-slate-600 dark:text-slate-300 rounded-full px-1.5 py-0.2 text-[10px]">
              {totalIssues}
            </span>
          )}
        </button>
      </div>

      {/* Content Container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {activeTab === 'summary' ? (
          <div className="space-y-5 text-center">
            {/* Quality Score Circle */}
            <div className={`mx-auto w-24 h-24 rounded-full border-4 flex flex-col items-center justify-center ${getScoreColor(overallQualityScore)} ${getScoreBg(overallQualityScore)} shadow-sm`}>
              <span className="text-3xl font-extrabold font-mono">{overallQualityScore}</span>
              <span className="text-[9px] font-semibold uppercase tracking-wider opacity-85">Quality</span>
            </div>

            <div className="space-y-1">
              <h3 className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {overallQualityScore >= 80 ? 'Excellent Code Quality!' : overallQualityScore >= 50 ? 'Minor Improvements Recommended' : 'Refactoring Strongly Advised'}
              </h3>
              <p className="text-[11px] text-slate-400 px-4 leading-normal">
                AI analysis has evaluated the code logic, structure, and security posture. Review issues detail to fix vulnerabilities.
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-2 pt-2">
              <div className="bg-slate-50 dark:bg-surface-900/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                <ShieldAlert className="w-4 h-4 text-red-500 mx-auto mb-1" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{securityIssues.length}</span>
                <p className="text-[9px] text-slate-400 mt-0.5">Security</p>
              </div>
              <div className="bg-slate-50 dark:bg-surface-900/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                <Bug className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{bugs.length}</span>
                <p className="text-[9px] text-slate-400 mt-0.5">Bugs</p>
              </div>
              <div className="bg-slate-50 dark:bg-surface-900/40 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800">
                <AlertTriangle className="w-4 h-4 text-yellow-500 mx-auto mb-1" />
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{codeSmells.length}</span>
                <p className="text-[9px] text-slate-400 mt-0.5">Smells</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {totalIssues === 0 ? (
              <div className="text-center py-12 text-slate-400 dark:text-slate-500">
                <CircleSlash className="w-10 h-10 mx-auto mb-2 opacity-40" />
                <p className="text-xs">No issues found. Perfect score!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* 1. Security Threat Lists */}
                {securityIssues.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 text-red-500" />
                      Security Issues
                    </h4>
                    {securityIssues.map((issue, idx) => (
                      <div
                        key={idx}
                        onClick={() => onSelectLine(issue.line)}
                        className="p-2.5 bg-red-50/30 dark:bg-red-950/5 border border-red-100 dark:border-red-950/40 rounded-xl cursor-pointer hover:border-red-300 dark:hover:border-red-800 transition-colors text-left"
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[9px] bg-red-100 dark:bg-red-950/60 text-red-800 dark:text-red-400 font-mono px-1.5 py-0.25 rounded">
                            Line {issue.line}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.25 rounded font-medium ${getSeverityBadge(issue.severity)}`}>
                            {issue.severity}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-350 leading-relaxed break-words">
                          {issue.issue}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* 2. Bugs Lists */}
                {bugs.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                      <Bug className="w-3.5 h-3.5 text-amber-500" />
                      Bugs Detected
                    </h4>
                    {bugs.map((bug, idx) => (
                      <div
                        key={idx}
                        onClick={() => onSelectLine(bug.line)}
                        className="p-2.5 bg-amber-50/20 dark:bg-amber-950/5 border border-amber-100/60 dark:border-amber-950/20 rounded-xl cursor-pointer hover:border-amber-300 dark:hover:border-amber-800 transition-colors text-left"
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[9px] bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 font-mono px-1.5 py-0.25 rounded">
                            Line {bug.line}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.25 rounded font-medium ${getSeverityBadge(bug.severity)}`}>
                            {bug.severity}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-350 leading-relaxed break-words">
                          {bug.issue}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* 3. Code Smell Lists */}
                {codeSmells.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
                      Code Smells
                    </h4>
                    {codeSmells.map((smell, idx) => (
                      <div
                        key={idx}
                        onClick={() => onSelectLine(smell.line)}
                        className="p-2.5 bg-slate-50 dark:bg-surface-900/30 border border-slate-100 dark:border-slate-800 rounded-xl cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-colors text-left"
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[9px] bg-slate-100 dark:bg-surface-700 text-slate-500 dark:text-slate-400 font-mono px-1.5 py-0.25 rounded">
                            Line {smell.line}
                          </span>
                          <Eye className="w-3 h-3 text-slate-400" />
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-350 leading-relaxed">
                          {smell.issue}
                        </p>
                        {smell.suggestion && (
                          <div className="mt-1.5 pt-1.5 border-t border-slate-200/40 dark:border-slate-700/40 text-[10px] text-brand-600 dark:text-brand-400 italic">
                            <span className="font-semibold not-italic">Suggestion:</span> {smell.suggestion}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AiReviewSummarySidebar;
