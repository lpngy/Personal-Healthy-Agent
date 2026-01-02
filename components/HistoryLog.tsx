import React, { useMemo } from 'react';
import { FoodLogEntry, MealType, UserProfile } from '../types';
import { Trash2, TrendingUp, AlertCircle, CheckCircle, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from './Button';

interface HistoryLogProps {
  logs: FoodLogEntry[];
  userProfile: UserProfile;
  selectedDate: string;
  onDateChange: (date: string) => void;
  onAnalyzeDay: () => void;
  onDeleteLog: (id: string) => void;
  onClearAll: () => void;
  analysisResult?: string;
  loadingAnalysis: boolean;
}

export const HistoryLog: React.FC<HistoryLogProps> = ({ 
  logs, 
  userProfile,
  selectedDate,
  onDateChange,
  onAnalyzeDay, 
  onDeleteLog,
  onClearAll,
  analysisResult,
  loadingAnalysis
}) => {
  const todaysDate = new Date().toISOString().split('T')[0];
  const isToday = selectedDate === todaysDate;
  
  const currentLogs = logs.filter(log => log.date === selectedDate);
  
  const totalCalories = currentLogs.reduce((sum, log) => sum + log.analysis.calories, 0);
  const percentComplete = Math.min((totalCalories / userProfile.calorieTarget) * 100, 100);

  // Group by meal type
  const groupedLogs = useMemo(() => {
    const grouped: Record<string, FoodLogEntry[]> = {
      [MealType.BREAKFAST]: [],
      [MealType.LUNCH]: [],
      [MealType.DINNER]: [],
      [MealType.SNACK]: [],
    };
    currentLogs.forEach(log => {
      if (grouped[log.type]) {
        grouped[log.type].push(log);
      }
    });
    return grouped;
  }, [currentLogs]);

  const hasMainMeals = 
    (groupedLogs[MealType.BREAKFAST]?.length || 0) > 0 && 
    (groupedLogs[MealType.LUNCH]?.length || 0) > 0 && 
    (groupedLogs[MealType.DINNER]?.length || 0) > 0;

  const mealOrder = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER, MealType.SNACK];

  const handleDateShift = (days: number) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    onDateChange(date.toISOString().split('T')[0]);
  };

  const displayDate = new Date(selectedDate).toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' });

  return (
    <div className="space-y-6 pb-24">
      {/* Date Navigator */}
      <div className="flex items-center justify-between bg-white p-2 rounded-xl shadow-sm border border-stone-100">
        <button onClick={() => handleDateShift(-1)} className="p-2 text-stone-500 hover:bg-stone-100 rounded-lg">
          <ChevronLeft size={20} />
        </button>
        <div className="flex items-center gap-2 text-avocado-900 font-bold">
          <Calendar size={16} />
          <span>{displayDate}</span>
          {isToday && <span className="text-xs bg-avocado-100 text-avocado-700 px-2 py-0.5 rounded-full">今天</span>}
        </div>
        <button 
          onClick={() => handleDateShift(1)} 
          disabled={isToday}
          className={`p-2 rounded-lg ${isToday ? 'text-stone-200' : 'text-stone-500 hover:bg-stone-100'}`}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Header Summary */}
      <div className="bg-avocado-500 text-white p-6 rounded-3xl shadow-lg shadow-avocado-500/20">
        <div className="flex justify-between items-end mb-4">
          <div>
            <p className="text-avocado-100 text-sm font-medium">摄入热量</p>
            <h1 className="text-4xl font-bold mt-1">{totalCalories}</h1>
          </div>
          <div className="text-right">
            <p className="text-avocado-100 text-xs mb-1">目标</p>
            <p className="font-semibold">{userProfile.calorieTarget}</p>
          </div>
        </div>
        <div className="h-3 bg-black/10 rounded-full overflow-hidden">
          <div 
            className="h-full bg-white transition-all duration-1000 ease-out" 
            style={{ width: `${percentComplete}%` }} 
          />
        </div>
      </div>

      {/* Settings / Actions */}
      <div className="flex justify-between items-center px-2">
        <h2 className="font-bold text-stone-800 text-lg">膳食记录</h2>
        {currentLogs.length > 0 && (
          <button 
            onClick={onClearAll} 
            className="text-xs text-red-400 flex items-center gap-1 hover:text-red-600"
          >
            <Trash2 size={12} /> 清空
          </button>
        )}
      </div>

      {/* List */}
      <div className="space-y-4">
        {currentLogs.length === 0 ? (
          <div className="text-center py-12 text-stone-400">
            <p>该日期没有记录膳食。</p>
            {isToday && <p className="text-sm">点击相机开始记录。</p>}
          </div>
        ) : (
          mealOrder.map((type) => {
            const entries = groupedLogs[type];
            if (!entries || entries.length === 0) return null;

            return (
              <div key={type} className="animate-fade-in">
                <h3 className="text-xs font-bold text-stone-400 uppercase mb-2 ml-2">{type}</h3>
                <div className="space-y-2">
                  {entries.map(log => (
                    <div key={log.id} className="bg-white p-4 rounded-2xl shadow-sm border border-stone-100 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 bg-avocado-50 rounded-full flex items-center justify-center text-xl">
                          {log.analysis.ifsuitable ? '🥗' : '⚠️'}
                        </div>
                        <div>
                          <p className="font-semibold text-stone-800">{log.analysis.foodName}</p>
                          <p className="text-xs text-stone-500">{log.analysis.calories} kcal • {log.analysis.protein} P</p>
                        </div>
                      </div>
                      <button onClick={() => onDeleteLog(log.id)} className="text-stone-300 hover:text-red-400 p-2">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Analysis Section */}
      {hasMainMeals && !analysisResult && (
        <Button 
          onClick={onAnalyzeDay} 
          isLoading={loadingAnalysis} 
          className="w-full bg-stone-800 text-white shadow-none"
        >
          <TrendingUp size={18} className="mr-2" />
          分析该日饮食
        </Button>
      )}

      {analysisResult && (
        <div className="bg-white p-6 rounded-2xl border-l-4 border-avocado-500 shadow-sm animate-slide-up">
          <h3 className="font-bold text-lg mb-2 flex items-center gap-2">
            <CheckCircle className="text-avocado-500" size={20} />
            分析报告
          </h3>
          <p className="text-stone-600 text-sm whitespace-pre-line leading-relaxed">
            {analysisResult}
          </p>
        </div>
      )}
    </div>
  );
};