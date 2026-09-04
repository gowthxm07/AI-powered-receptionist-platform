import React from 'react';
import { Bot, User } from 'lucide-react';
import { ChatMessage } from '../../types/conversation';

interface ConversationMessageProps {
  message: ChatMessage;
}

export const ConversationMessage: React.FC<ConversationMessageProps> = ({ message }) => {
  const isUser = message.sender === 'user';

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
        {/* Header for AI Responses */}
        {!isUser && (
          <div className="flex items-center gap-2 mb-1.5 pb-1.5 border-b border-slate-800/80">
            <span className="text-xs font-semibold text-slate-300 tracking-tight">
              AI Receptionist
            </span>
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
