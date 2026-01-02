import React, { useState, useEffect } from 'react';
import { UserProfile, GoalType, FoodLogEntry } from './types';
import { CameraAnalyzer } from './components/CameraAnalyzer';
import { HistoryLog } from './components/HistoryLog';
import { HealthPlanner } from './components/HealthPlanner';
import { Button } from './components/Button';
import { analyzeDailyLog, calculateDailyCalories } from './services/geminiService';
import { Home, Camera, MessageSquare, Settings as SettingsIcon, Heart, Sparkles } from 'lucide-react';

enum View {
  HOME = 'HOME',
  CAMERA = 'CAMERA',
  PLANNER = 'PLANNER',
  SETTINGS = 'SETTINGS'
}

const DEFAULT_PROFILE: UserProfile = {
  name: 'User',
  baseHealthCondition: '',
  currentFeeling: '',
  goal: GoalType.MAINTAIN,
  calorieTarget: 0, // Will be calculated
  onboardingDone: false
};

const App: React.FC = () => {
  const [view, setView] = useState<View>(View.HOME);
  const [userProfile, setUserProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [logs, setLogs] = useState<FoodLogEntry[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [dailyAnalysis, setDailyAnalysis] = useState<string | null>(null);
  const [analyzingDaily, setAnalyzingDaily] = useState(false);
  
  // New States
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [chatHistory, setChatHistory] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [onboardingLoading, setOnboardingLoading] = useState(false);

  // Load Data
  useEffect(() => {
    const savedProfile = localStorage.getItem('silk_kcal_profile');
    const savedLogs = localStorage.getItem('silk_kcal_logs');
    const savedChat = localStorage.getItem('silk_kcal_chat');
    
    if (savedProfile) setUserProfile(JSON.parse(savedProfile));
    if (savedLogs) setLogs(JSON.parse(savedLogs));
    if (savedChat) setChatHistory(JSON.parse(savedChat));
  }, []);

  // Save Data
  useEffect(() => {
    localStorage.setItem('silk_kcal_profile', JSON.stringify(userProfile));
  }, [userProfile]);

  useEffect(() => {
    localStorage.setItem('silk_kcal_logs', JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    localStorage.setItem('silk_kcal_chat', JSON.stringify(chatHistory));
  }, [chatHistory]);

  const addLog = (entry: FoodLogEntry) => {
    setLogs(prev => [entry, ...prev]);
    // Only reset analysis if the log was for today and we are viewing today
    const today = new Date().toISOString().split('T')[0];
    if (entry.date === today && selectedDate === today) {
      setDailyAnalysis(null); 
    }
  };

  const deleteLog = (id: string) => {
    if (confirm("删除这条记录？")) {
      setLogs(prev => prev.filter(l => l.id !== id));
    }
  };

  const clearLogs = () => {
    if (confirm("清空该日期的所有记录？")) {
      setLogs(prev => prev.filter(l => l.date !== selectedDate));
      if (selectedDate === new Date().toISOString().split('T')[0]) {
        setDailyAnalysis(null);
      }
    }
  };

  const handleAnalyzeDay = async () => {
    setAnalyzingDaily(true);
    const dayLogs = logs.filter(l => l.date === selectedDate);
    const result = await analyzeDailyLog(dayLogs, userProfile);
    setDailyAnalysis(result);
    setAnalyzingDaily(false);
  };

  const handleOnboardingComplete = async () => {
    setOnboardingLoading(true);
    // Auto calculate calorie target
    const target = await calculateDailyCalories(userProfile);
    
    setUserProfile(prev => ({
      ...prev,
      calorieTarget: target,
      onboardingDone: true
    }));
    setOnboardingLoading(false);
  };

  // Onboarding
  if (!userProfile.onboardingDone) {
    return (
      <div className="min-h-screen bg-avocado-50 flex flex-col justify-center p-8 max-w-md mx-auto">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-avocado-500 rounded-3xl mx-auto flex items-center justify-center mb-4 shadow-xl shadow-avocado-500/20">
            <Heart className="text-white" size={40} />
          </div>
          <h1 className="text-3xl font-bold text-avocado-900 mb-2">Silk Kcal</h1>
          <p className="text-stone-600">您的 AI 个人健康助手。</p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-sm space-y-4">
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-1">健康状况</label>
            <input 
              type="text" 
              placeholder="例如：糖尿病、无" 
              className="w-full p-3 bg-stone-50 rounded-xl"
              value={userProfile.baseHealthCondition}
              onChange={e => setUserProfile({...userProfile, baseHealthCondition: e.target.value})}
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-stone-700 mb-1">今日感受</label>
            <input 
              type="text" 
              placeholder="例如：精力充沛、腹胀" 
              className="w-full p-3 bg-stone-50 rounded-xl"
              value={userProfile.currentFeeling}
              onChange={e => setUserProfile({...userProfile, currentFeeling: e.target.value})}
            />
          </div>
          <div>
             <label className="block text-sm font-bold text-stone-700 mb-1">目标</label>
             <select 
               className="w-full p-3 bg-stone-50 rounded-xl"
               value={userProfile.goal}
               onChange={e => setUserProfile({...userProfile, goal: e.target.value as GoalType})}
             >
               {Object.values(GoalType).map(g => <option key={g} value={g}>{g}</option>)}
             </select>
          </div>
          
          <div className="p-3 bg-avocado-50 rounded-xl border border-avocado-100 text-sm text-avocado-800 flex gap-2 items-start mt-2">
            <Sparkles size={16} className="mt-0.5 shrink-0" />
            <p>我们将根据您的上述信息，自动为您计算最适合的每日热量目标。</p>
          </div>

          <Button 
            onClick={handleOnboardingComplete} 
            isLoading={onboardingLoading}
            className="w-full mt-4"
          >
            {onboardingLoading ? "正在计算健康目标..." : "开始使用"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-800 max-w-md mx-auto relative shadow-2xl overflow-hidden">
      
      {/* Top Bar */}
      <header className="px-6 pt-12 pb-4 flex justify-between items-center bg-white/50 backdrop-blur-sm sticky top-0 z-20">
        <div>
           <h1 className="text-xl font-bold text-avocado-900">Silk Kcal</h1>
           <p className="text-xs text-stone-500 capitalize">
             {new Date().toLocaleDateString('zh-CN', { weekday: 'long', month: 'long', day: 'numeric' })}
           </p>
        </div>
        <button onClick={() => setView(View.SETTINGS)} className="p-2 bg-white rounded-full shadow-sm hover:bg-stone-50">
          <SettingsIcon size={20} className="text-stone-600" />
        </button>
      </header>

      {/* Main Content Area */}
      <main className="px-4 pb-32 pt-2 min-h-[80vh]">
        {view === View.HOME && (
          <HistoryLog 
            logs={logs} 
            userProfile={userProfile}
            selectedDate={selectedDate}
            onDateChange={(date) => {
              setSelectedDate(date);
              setDailyAnalysis(null); // Reset analysis when changing date
            }}
            onAnalyzeDay={handleAnalyzeDay}
            onDeleteLog={deleteLog}
            onClearAll={clearLogs}
            analysisResult={dailyAnalysis || undefined}
            loadingAnalysis={analyzingDaily}
          />
        )}
        
        {view === View.PLANNER && (
          <HealthPlanner 
            userProfile={userProfile} 
            messages={chatHistory}
            onMessagesChange={setChatHistory}
          />
        )}

        {view === View.SETTINGS && (
           <div className="space-y-4 pt-4">
             <div className="bg-white p-6 rounded-3xl">
               <h2 className="font-bold text-lg mb-4">编辑档案</h2>
               <div className="space-y-4">
                 <div>
                   <label className="text-xs font-bold text-stone-400">今日感受</label>
                   <input 
                      className="w-full border-b border-stone-200 py-2 outline-none focus:border-avocado-500"
                      value={userProfile.currentFeeling}
                      onChange={e => setUserProfile({...userProfile, currentFeeling: e.target.value})}
                   />
                 </div>
                 <div>
                   <label className="text-xs font-bold text-stone-400">热量目标 (自动计算: {userProfile.calorieTarget})</label>
                   <div className="flex gap-2">
                    <input 
                        type="number"
                        className="w-full border-b border-stone-200 py-2 outline-none focus:border-avocado-500"
                        value={userProfile.calorieTarget}
                        onChange={e => setUserProfile({...userProfile, calorieTarget: parseInt(e.target.value) || 0})}
                    />
                    <button 
                      onClick={async () => {
                        const target = await calculateDailyCalories(userProfile);
                        setUserProfile(prev => ({...prev, calorieTarget: target}));
                        alert(`已根据当前状态重新计算: ${target} kcal`);
                      }}
                      className="text-xs bg-avocado-100 text-avocado-700 px-3 rounded-lg"
                    >
                      重新计算
                    </button>
                   </div>
                 </div>
               </div>
             </div>
             <Button variant="ghost" onClick={() => {
               if(confirm("确定要清除所有数据并重置应用吗？")) {
                localStorage.clear();
                window.location.reload();
               }
             }} className="w-full text-red-400">重置应用数据</Button>
           </div>
        )}
      </main>

      {/* Floating Action Button for Camera */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-30">
        <button 
          onClick={() => setShowCamera(true)}
          className="h-16 w-16 bg-avocado-900 rounded-full flex items-center justify-center text-white shadow-lg shadow-avocado-900/40 hover:scale-105 transition-transform"
        >
          <Camera size={28} />
        </button>
      </div>

      {/* Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-stone-100 p-4 pb-8 flex justify-around items-center z-20 max-w-md mx-auto">
        <button 
          onClick={() => setView(View.HOME)}
          className={`flex flex-col items-center gap-1 ${view === View.HOME ? 'text-avocado-600' : 'text-stone-400'}`}
        >
          <Home size={24} />
          <span className="text-[10px] font-medium">日报</span>
        </button>

        <div className="w-12" /> {/* Spacer for FAB */}

        <button 
          onClick={() => setView(View.PLANNER)}
          className={`flex flex-col items-center gap-1 ${view === View.PLANNER ? 'text-avocado-600' : 'text-stone-400'}`}
        >
          <MessageSquare size={24} />
          <span className="text-[10px] font-medium">计划</span>
        </button>
      </nav>

      {/* Camera Overlay */}
      {showCamera && (
        <CameraAnalyzer 
          userProfile={userProfile}
          todaysLogs={logs.filter(l => l.date === new Date().toISOString().split('T')[0])}
          onSave={addLog}
          onClose={() => setShowCamera(false)}
        />
      )}
    </div>
  );
};

export default App;