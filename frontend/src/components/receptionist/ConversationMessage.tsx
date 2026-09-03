import React from 'react';
import { Bot, User, Zap, Wrench, Sparkles, ShieldAlert, Clock } from 'lucide-react';
import { ChatMessage, ResponseSource } from '../../types/conversation';

interface ConversationMessageProps {
  message: ChatMessage;
}

export const ConversationMessage: React.FC<ConversationMessageProps> = ({ message }) => {
  const isUser = message.sender === 'user';

  const getSourceBadge = (source?: ResponseSource) => {
    switch (source) {
      case 'deterministic':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <Zap className="w-2.5 h-2.5" />
            Deterministic
          </span>
        );
      case 'tool':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/15 text-blue-300 border border-blue-500/30">
            <Wrench className="w-2.5 h-2.5" />
            DB Tool {message.action ? `(${message.action.toLowerCase()})` : ''}
          </span>
        );
      case 'llm':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/15 text-purple-300 border border-purple-500/30">
            <Sparkles className="w-2.5 h-2.5" />
            Local LLM (llama3.2:3b)
          </span>
        );
      case 'fallback':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <ShieldAlert className="w-2.5 h-2.5" />
            Safe Fallback
          </span>
        );
      default:
        return null;
    }
  };

  const formatLatency = (ms?: number) => {
    if (ms === undefined || ms === null) return null;
    if (ms < 1000) {
      return `${ms.toFixed(1)}ms`;
    }
    return `${(ms / 1000).toFixed(2)}s`;
  };

  return (
    <div
      className={`flex items-start gap-3 my-3 group transition-opacity duration-200 ${
        isUser ? 'flex-row-reverse' : 'flex-row'
      }`}
    >
      {/* Avatar Icon */}
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-md ${
          isUser
            ? 'bg-gradient-to-tr from-indigo-600 to-blue-500 text-white shadow-indigo-500/20'
            : 'bg-slate-800 border border-slate-700/80 text-indigo-400 shadow-slate-900/50'
        }`}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      {/* Bubble Content */}
      <div
        className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-4 transition-all shadow-sm ${
          isUser
            ? 'bg-indigo-600 text-white rounded-tr-sm shadow-indigo-600/10'
            : 'bg-slate-900/90 border border-slate-800 text-slate-100 rounded-tl-sm shadow-black/20'
        }`}
      >
        {/* Header Badges for AI Responses */}
        {!isUser && (
          <div className="flex flex-wrap items-center gap-2 mb-2 pb-2 border-b border-slate-800/80">
            <span className="text-xs font-semibold text-slate-300 tracking-tight flex items-center gap-1">
              AI Receptionist
            </span>

            {getSourceBadge(message.source)}

            {message.latencyMs !== undefined && (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-mono text-slate-400 bg-slate-950/60 px-1.5 py-0.5 rounded border border-slate-800"
                title={`Engine Latency: ${formatLatency(message.latencyMs)}${
                  message.totalLatencyMs ? ` | Total API Latency: ${formatLatency(message.totalLatencyMs)}` : ''
                }`}
              >
                <Clock className="w-2.5 h-2.5 text-slate-500" />
                {formatLatency(message.latencyMs)}
              </span>
            )}
          </div>
        )}

        {/* Message Text Body */}
        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{message.text}</p>

        {/* Timestamp Footer */}
        <div
          className={`text-[10px] mt-2 font-mono flex items-center justify-end gap-1 ${
            isUser ? 'text-indigo-200/70' : 'text-slate-500'
          }`}
        >
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  );
};
