export enum MealType {
  BREAKFAST = '早餐',
  LUNCH = '午餐',
  DINNER = '晚餐',
  SNACK = '加餐',
}

export enum GoalType {
  LOSE = '减重',
  MAINTAIN = '保持体重',
  GAIN = '增肌',
}

export interface UserProfile {
  name: string;
  baseHealthCondition: string; // e.g., "有糖尿病", "无"
  currentFeeling: string; // e.g., "感觉腹胀", "精力充沛"
  goal: GoalType;
  calorieTarget: number;
  onboardingDone: boolean;
}

export interface FoodAnalysisResult {
  foodName: string;
  calories: number;
  protein: string;
  carbs: string;
  fat: string;
  ifsuitable: boolean;
  ifsuitabletoday: boolean;
  explanation: string;
}

export interface FoodLogEntry {
  id: string;
  date: string; // ISO Date string YYYY-MM-DD
  timestamp: number;
  type: MealType;
  analysis: FoodAnalysisResult;
  imageUrl?: string; // Base64
}

export interface DailySummary {
  date: string;
  totalCalories: number;
  logs: FoodLogEntry[];
  analysis?: string; // Daily analysis from Gemini
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isPlan?: boolean; // If true, render as a structured plan
}