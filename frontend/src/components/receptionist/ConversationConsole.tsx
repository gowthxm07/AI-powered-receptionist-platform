import React, { useState, useEffect, useRef } from 'react';
import { Bot, Sparkles, AlertCircle, RotateCcw, Building2, Zap, MessageSquare } from 'lucide-react';
import { useBusiness } from '../../context/BusinessContext';
import { api, ApiError } from '../../lib/api';
import {
  ChatMessage,
  ConversationMetadata,
  ConversationResponseData,
  ResponseSource,
} from '../../types/conversation';
import { ConversationMessage } from './ConversationMessage';
import { ConversationInput } from './ConversationInput';
import { TypingIndicator } from './TypingIndicator';
import { ConversationMetadataPanel } from './ConversationMetadataPanel';

export const ConversationConsole: React.FC = () => {
  const { selectedBusiness, selectedBusinessId, loading: businessLoading } = useBusiness();

  // Chat & Session State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSessionExpired, setIsSessionExpired] = useState<boolean>(false);

  // Live Metadata & Telemetry
  const [lastSource, setLastSource] = useState<ResponseSource | undefined>(undefined);
  const [lastIntent, setLastIntent] = useState<string | undefined>(undefined);
  const [lastAction, setLastAction] = useState<string | undefined>(undefined);
  const [lastLatencyMs, setLastLatencyMs] = useState<number | undefined>(undefined);
  const [lastTotalLatencyMs, setLastTotalLatencyMs] = useState<number | undefined>(undefined);
  const [conversationMetadata, setConversationMetadata] = useState<ConversationMetadata | undefined>(undefined);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Safe Business Switch Handler: reset session when business changes
  useEffect(() => {
    if (selectedBusiness) {
      setSessionId(null);
      setErrorMessage(null);
      setIsSessionExpired(false);
      setLastSource(undefined);
      setLastIntent(undefined);
      setLastAction(undefined);
      setLastLatencyMs(undefined);
      setLastTotalLatencyMs(undefined);
      setConversationMetadata(undefined);

      // Initial greeting from AI Receptionist
      const initialGreeting: ChatMessage = {
        id: `welcome-${Date.now()}`,
        sender: 'assistant',
        text: `Hello! Welcome to ${selectedBusiness.name}. I am your virtual receptionist. How may I assist you today? You can inquire about our services, specialists, or schedule an appointment.`,
        timestamp: new Date(),
        source: 'deterministic',
        intent: 'GREETING',
        action: 'NONE',
        latencyMs: 0.1,
      };

      setMessages([initialGreeting]);
    } else {
      setMessages([]);
      setSessionId(null);
    }
  }, [selectedBusinessId]);

  // Handle "+ New Conversation" reset
  const handleResetConversation = () => {
    setSessionId(null);
    setErrorMessage(null);
    setIsSessionExpired(false);
    setLastSource(undefined);
    setLastIntent(undefined);
    setLastAction(undefined);
    setLastLatencyMs(undefined);
    setLastTotalLatencyMs(undefined);
    setConversationMetadata(undefined);

    if (selectedBusiness) {
      const resetGreeting: ChatMessage = {
        id: `reset-${Date.now()}`,
        sender: 'assistant',
        text: `Welcome back to ${selectedBusiness.name}! Starting a new conversation. How can I help you today?`,
        timestamp: new Date(),
        source: 'deterministic',
        intent: 'GREETING',
        action: 'NONE',
        latencyMs: 0.1,
      };
      setMessages([resetGreeting]);
    } else {
      setMessages([]);
    }
  };

  // Main message sending handler
  const handleSendMessage = async (text: string) => {
    if (!selectedBusinessId || isLoading) return;

    setErrorMessage(null);
    setIsSessionExpired(false);

    // 1. Immediately append user message to UI
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // 2. Call backend conversation API
      const res = await api.ai.conversation({
        sessionId: sessionId || undefined,
        businessId: selectedBusinessId,
        message: text,
      });

      if (res.success && res.data) {
        const data: ConversationResponseData = res.data;

        // Save / update session ID
        setSessionId(data.sessionId);

        // Update telemetry
        setLastSource(data.source);
        setLastIntent(data.intent);
        setLastAction(data.action);
        setLastLatencyMs(data.latencyMs);
        setLastTotalLatencyMs(data.totalLatencyMs);
        setConversationMetadata(data.metadata);

        // Append AI response message
        const aiMsg: ChatMessage = {
          id: `ai-${Date.now()}`,
          sender: 'assistant',
          text: data.response,
          timestamp: new Date(),
          source: data.source,
          action: data.action,
          intent: data.intent,
          latencyMs: data.latencyMs,
          totalLatencyMs: data.totalLatencyMs,
          metadata: data.metadata,
        };

        setMessages((prev) => [...prev, aiMsg]);
      } else {
        throw new Error(res.message || 'Failed to process message.');
      }
    } catch (err: any) {
      console.error('Conversation error:', err);
      if (err instanceof ApiError && err.status === 410) {
        setIsSessionExpired(true);
        setErrorMessage('Your conversation session has expired. Please start a new conversation.');
      } else {
        const msg = err instanceof ApiError ? err.message : 'Unable to reach the AI receptionist service. Please verify the backend is running.';
        setErrorMessage(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto min-h-[calc(100vh-10rem)]">
      {/* ==================================================================== */}
      {/* MAIN CHAT CONSOLE (Left / Center) */}
      {/* ==================================================================== */}
      <div className="flex-1 flex flex-col bg-slate-950/60 border border-slate-800/80 rounded-3xl overflow-hidden shadow-2xl backdrop-blur-sm">
        {/* Chat Console Header */}
        <div className="px-6 py-4 border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-blue-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-tight">AI Receptionist</h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Online
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Interact with your AI receptionist and test how it handles customer inquiries.
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={handleResetConversation}
              disabled={isLoading || !selectedBusiness}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700/80 border border-slate-700/60 transition-colors disabled:opacity-50"
            >
              <RotateCcw className="w-3.5 h-3.5 text-indigo-400" />
              Reset
            </button>
          </div>
        </div>

        {/* Chat Messages Viewport */}
        <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 space-y-2 scrollbar-thin scrollbar-thumb-slate-800">
          {businessLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500 gap-3">
              <div className="w-8 h-8 rounded-full border-2 border-indigo-500/30 border-t-indigo-500 animate-spin" />
              <p className="text-xs">Loading business context...</p>
            </div>
          ) : !selectedBusiness ? (
            <div className="flex flex-col items-center justify-center h-64 text-center text-slate-400 p-6">
              <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-3 text-slate-500">
                <Building2 className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-slate-200">No Enterprise Selected</h4>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                Please select a business from the dashboard selector to connect to its specific AI receptionist.
              </p>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-500 text-xs">
              <MessageSquare className="w-8 h-8 mb-2 opacity-50 text-indigo-400" />
              Start typing below to speak with the AI receptionist.
            </div>
          ) : (
            messages.map((msg) => <ConversationMessage key={msg.id} message={msg} />)
          )}

          {/* In-Flight Typing Indicator */}
          {isLoading && <TypingIndicator />}

          {/* Session Expired Notice */}
          {isSessionExpired && (
            <div className="my-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 text-amber-400" />
                <span>Your conversation session has expired (15m TTL).</span>
              </div>
              <button
                onClick={handleResetConversation}
                className="px-3 py-1.5 rounded-xl font-semibold bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 border border-amber-500/40 transition-colors"
              >
                Start New Session
              </button>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && !isSessionExpired && (
            <div className="my-3 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-center gap-2.5 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-900/40">
          <ConversationInput
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            disabled={!selectedBusiness || isSessionExpired}
            placeholder={
              selectedBusiness
                ? `Message ${selectedBusiness.name}'s receptionist...`
                : 'Select an enterprise to start...'
            }
          />
        </div>
      </div>

      {/* ==================================================================== */}
      {/* TECHNICAL TELEMETRY SIDEBAR (Right) */}
      {/* ==================================================================== */}
      <div className="w-full lg:w-80 flex-shrink-0">
        <ConversationMetadataPanel
          business={selectedBusiness}
          sessionId={sessionId}
          lastSource={lastSource}
          lastIntent={lastIntent}
          lastAction={lastAction}
          lastLatencyMs={lastLatencyMs}
          lastTotalLatencyMs={lastTotalLatencyMs}
          metadata={conversationMetadata}
          onResetSession={handleResetConversation}
          onSelectPrompt={(prompt) => handleSendMessage(prompt)}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};
