import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, ChatMessage } from '../types';
import { chatWithHealthBot, generateMealPlans } from '../services/geminiService';
import { Send, User, Bot, Sparkles } from 'lucide-react';

interface HealthPlannerProps {
  userProfile: UserProfile;
  messages: {role: 'user' | 'model', text: string}[];
  onMessagesChange: (msgs: {role: 'user' | 'model', text: string}[]) => void;
}

export const HealthPlanner: React.FC<HealthPlannerProps> = ({ userProfile, messages, onMessagesChange }) => {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const initialGenRef = useRef(false);

  useEffect(() => {
    // Only generate initial plan if history is empty and we haven't tried yet
    if (messages.length === 0 && !initialGenRef.current) {
      initialGenRef.current = true;
      handleGenerateInitialPlan();
    }
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleGenerateInitialPlan = async () => {
    setLoading(true);
    // Add a ghost message locally or to state? Better to state to show loading intent
    onMessagesChange([{ role: 'model', text: '正在根据您的健康档案生成个性化膳食计划...' }]);
    
    const plan = await generateMealPlans(userProfile);
    
    // Replace the loading message
    onMessagesChange([{ role: 'model', text: plan }]);
    setLoading(false);
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input;
    setInput('');
    
    const newHistory = [...messages, { role: 'user', text: userMsg } as const];
    onMessagesChange(newHistory);
    setLoading(true);

    // Format history for Gemini API
    const historyForApi = newHistory.map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));

    const response = await chatWithHealthBot(historyForApi, userMsg);
    onMessagesChange([...newHistory, { role: 'model', text: response }]);
    setLoading(false);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)]">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-stone-200' : 'bg-avocado-100'}`}>
              {msg.role === 'user' ? <User size={14} className="text-stone-600" /> : <Bot size={14} className="text-avocado-600" />}
            </div>
            <div className={`p-4 rounded-2xl max-w-[85%] text-sm leading-relaxed whitespace-pre-wrap ${
              msg.role === 'user' 
                ? 'bg-stone-100 text-stone-800 rounded-tr-sm' 
                : 'bg-white border border-stone-100 text-stone-700 rounded-tl-sm shadow-sm'
            }`}>
              {msg.text}
            </div>
          </div>
        ))}
        {loading && (
           <div className="flex gap-3">
             <div className="w-8 h-8 rounded-full bg-avocado-100 flex items-center justify-center shrink-0">
               <Sparkles size={14} className="text-avocado-600 animate-pulse" />
             </div>
             <div className="bg-white p-4 rounded-2xl rounded-tl-sm shadow-sm flex gap-1 items-center">
               <div className="w-2 h-2 bg-stone-300 rounded-full animate-bounce"></div>
               <div className="w-2 h-2 bg-stone-300 rounded-full animate-bounce delay-75"></div>
               <div className="w-2 h-2 bg-stone-300 rounded-full animate-bounce delay-150"></div>
             </div>
           </div>
        )}
        <div ref={scrollRef} />
      </div>

      <div className="p-4 bg-white border-t border-stone-100">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="询问关于替代品、食谱的问题..."
            className="flex-1 bg-stone-50 border-0 rounded-xl px-4 focus:ring-2 focus:ring-avocado-500 outline-none"
          />
          <button 
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="p-3 bg-avocado-500 text-white rounded-xl hover:bg-avocado-600 disabled:opacity-50 transition-colors"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};