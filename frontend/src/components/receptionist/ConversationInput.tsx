import React, { useState, useRef, useEffect } from 'react';
import { Send, CornerDownLeft, Loader2 } from 'lucide-react';

interface ConversationInputProps {
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export const ConversationInput: React.FC<ConversationInputProps> = ({
  onSendMessage,
  isLoading,
  disabled = false,
  placeholder = 'Type your message or booking request...',
}) => {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 140)}px`;
    }
  }, [text]);

  // Focus textarea when loading ends
  useEffect(() => {
    if (!isLoading && !disabled && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isLoading, disabled]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isLoading || disabled) return;

    const trimmed = text.trim();
    if (!trimmed) return;

    onSendMessage(trimmed);
    setText('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const charCount = text.length;
  const isOverLimit = charCount > 1000;
  const isReady = text.trim().length > 0 && !isOverLimit && !isLoading && !disabled;

  return (
    <form onSubmit={handleSubmit} className="relative">
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-2.5 shadow-xl shadow-black/30 focus-within:border-indigo-500/60 focus-within:ring-1 focus-within:ring-indigo-500/50 transition-all">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || isLoading}
          placeholder={disabled ? 'Please select a business to start conversation' : placeholder}
          rows={1}
          maxLength={1000}
          className="w-full bg-transparent text-sm text-slate-100 placeholder-slate-500 resize-none outline-none px-2 py-1.5 min-h-[44px] max-h-[140px] scrollbar-thin scrollbar-thumb-slate-800"
        />

        {/* Input Footer toolbar */}
        <div className="flex items-center justify-between pt-2 px-2 border-t border-slate-800/60 text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-400">
                Enter
              </kbd>{' '}
              to send
            </span>
            <span className="hidden sm:inline-flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] font-mono text-slate-400">
                Shift + Enter
              </kbd>{' '}
              for new line
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Character counter */}
            <span className={`font-mono text-[10px] ${isOverLimit ? 'text-rose-400 font-bold' : 'text-slate-500'}`}>
              {charCount}/1000
            </span>

            {/* Send Button */}
            <button
              type="submit"
              disabled={!isReady}
              aria-label="Send message"
              className={`p-2 rounded-xl flex items-center justify-center transition-all ${
                isReady
                  ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-lg shadow-indigo-600/30 hover:scale-105 active:scale-95'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700/50'
              }`}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
};
