import React from 'react';
import { Bot, Sparkles } from 'lucide-react';

export const TypingIndicator: React.FC = () => {
  return (
    <div className="flex items-start gap-3 my-3 animate-fadeIn">
      {/* Avatar Icon */}
      <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700/80 text-indigo-400 flex items-center justify-center flex-shrink-0 shadow-md">
        <Bot className="w-4 h-4 animate-pulse" />
      </div>

      {/* Pulsing Bubble */}
      <div className="bg-slate-900/90 border border-slate-800 text-slate-300 rounded-2xl rounded-tl-sm p-3.5 shadow-sm flex items-center gap-3">
        <div className="flex items-center gap-1.5 px-1">
          <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.3s]"></span>
          <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce [animation-delay:-0.15s]"></span>
          <span className="w-2 h-2 rounded-full bg-indigo-300 animate-bounce"></span>
        </div>
        <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
          <Sparkles className="w-3 h-3 text-indigo-400 animate-spin" />
          AI Receptionist is thinking...
        </span>
      </div>
    </div>
  );
};
