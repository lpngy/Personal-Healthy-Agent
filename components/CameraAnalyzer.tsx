import React, { useState, useRef } from 'react';
import { Camera, X, Check, RefreshCw, Upload } from 'lucide-react';
import { Button } from './Button';
import { analyzeFoodImage } from '../services/geminiService';
import { FoodAnalysisResult, FoodLogEntry, MealType, UserProfile } from '../types';

interface CameraAnalyzerProps {
  userProfile: UserProfile;
  todaysLogs: FoodLogEntry[];
  onSave: (entry: FoodLogEntry) => void;
  onClose: () => void;
}

export const CameraAnalyzer: React.FC<CameraAnalyzerProps> = ({ userProfile, todaysLogs, onSave, onClose }) => {
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<FoodAnalysisResult | null>(null);
  const [mealType, setMealType] = useState<MealType>(MealType.SNACK);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // Strip prefix for Gemini
        const base64Data = base64.split(',')[1];
        setImage(base64Data);
        processImage(base64Data);
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async (base64: string) => {
    setAnalyzing(true);
    try {
      const analysis = await analyzeFoodImage(base64, userProfile, todaysLogs);
      if (!analysis.ifsuitable) {
        alert("警告：此物品可能不可食用或不适合您！");
      }
      setResult(analysis);
    } catch (error) {
      alert("分析失败，请重试。");
      setImage(null);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleSave = () => {
    if (!result) return;
    const newEntry: FoodLogEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString().split('T')[0],
      timestamp: Date.now(),
      type: mealType,
      analysis: result,
      // In a real app, we might upload this. For now, we store the base64 or omit to save space.
      // Saving a thumbnail is better, but local storage has limits. 
      // We will not store the image string to prevent QuotaExceededError in localStorage for this demo.
    };
    onSave(newEntry);
    onClose();
  };

  const handleRetake = () => {
    setImage(null);
    setResult(null);
  };

  if (!image) {
    return (
      <div className="fixed inset-0 z-50 bg-black flex flex-col">
        <div className="flex-1 relative flex items-center justify-center">
          <p className="text-white/70 text-lg">点击按钮拍照</p>
        </div>
        
        {/* Controls */}
        <div className="bg-black/80 p-8 pb-12 flex justify-between items-center">
          <button onClick={onClose} className="p-4 text-white rounded-full bg-white/10">
            <X size={24} />
          </button>
          
          <div className="relative">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleCapture}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="h-20 w-20 bg-white rounded-full border-4 border-avocado-500 shadow-[0_0_20px_rgba(132,204,22,0.5)] active:scale-90 transition-transform flex items-center justify-center"
            >
              <Camera size={32} className="text-avocado-600" />
            </button>
          </div>
          
          <div className="w-14" /> {/* Spacer for balance */}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 bg-stone-900 flex flex-col">
      <div className="relative flex-1 bg-black">
        <img 
          src={`data:image/jpeg;base64,${image}`} 
          alt="Captured" 
          className="w-full h-full object-contain opacity-50" 
        />
        {analyzing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-avocado-500 border-t-transparent mb-4"></div>
            <p className="text-white font-medium animate-pulse">正在分析食物...</p>
          </div>
        )}
      </div>

      {result && (
        <div className="bg-white rounded-t-3xl -mt-6 relative z-10 p-6 shadow-[0_-10px_40px_rgba(0,0,0,0.3)] animate-slide-up h-[60vh] overflow-y-auto">
          <div className="w-12 h-1.5 bg-stone-200 rounded-full mx-auto mb-6" />
          
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-2xl font-bold text-stone-800">{result.foodName}</h2>
              <div className="flex gap-2 mt-1">
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${result.ifsuitable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {result.ifsuitable ? '可食用' : '不可食用/不适合'}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${result.ifsuitabletoday ? 'bg-avocado-100 text-avocado-700' : 'bg-orange-100 text-orange-700'}`}>
                  {result.ifsuitabletoday ? '适合今日' : '限制摄入'}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-3xl font-black text-avocado-600">{result.calories}</span>
              <span className="text-sm text-stone-500 block">千卡</span>
            </div>
          </div>

          <p className="text-stone-600 mb-6 text-sm leading-relaxed">{result.explanation}</p>

          {/* Macros */}
          <div className="space-y-3 mb-6">
             <div className="flex items-center gap-3">
               <span className="w-16 text-xs font-bold text-stone-400">蛋白质</span>
               <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                 <div className="h-full bg-blue-400 w-1/3"></div>
               </div>
               <span className="w-10 text-xs text-right font-medium">{result.protein}</span>
             </div>
             <div className="flex items-center gap-3">
               <span className="w-16 text-xs font-bold text-stone-400">碳水</span>
               <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                 <div className="h-full bg-yellow-400 w-1/2"></div>
               </div>
               <span className="w-10 text-xs text-right font-medium">{result.carbs}</span>
             </div>
             <div className="flex items-center gap-3">
               <span className="w-16 text-xs font-bold text-stone-400">脂肪</span>
               <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                 <div className="h-full bg-rose-400 w-1/4"></div>
               </div>
               <span className="w-10 text-xs text-right font-medium">{result.fat}</span>
             </div>
          </div>

          <div className="mb-6">
            <label className="text-xs font-bold text-stone-400 uppercase mb-2 block">用餐类型</label>
            <div className="grid grid-cols-4 gap-2">
              {Object.values(MealType).map((type) => (
                <button
                  key={type}
                  onClick={() => setMealType(type)}
                  className={`py-2 text-xs rounded-lg border ${
                    mealType === type 
                    ? 'bg-avocado-500 text-white border-avocado-500' 
                    : 'bg-white text-stone-600 border-stone-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button variant="secondary" onClick={handleRetake}>重拍</Button>
            <Button onClick={handleSave}>记录膳食</Button>
          </div>
        </div>
      )}
    </div>
  );
};