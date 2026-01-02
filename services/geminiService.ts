import { GoogleGenAI, Type } from "@google/genai";
import { FoodAnalysisResult, UserProfile, FoodLogEntry } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Models
const VISION_MODEL = "gemini-3-flash-preview"; // Optimized for image analysis
const TEXT_MODEL = "gemini-3-flash-preview"; // Optimized for reasoning and chat

/**
 * Calculates recommended daily calories based on user profile.
 */
export const calculateDailyCalories = async (userProfile: UserProfile): Promise<number> => {
  const prompt = `
    作为专业营养师，请根据以下用户资料估算每日推荐摄入热量（卡路里）：
    - 基础健康状况：${userProfile.baseHealthCondition}
    - 今日/近期感受：${userProfile.currentFeeling}
    - 目标：${userProfile.goal}
    
    仅返回一个整数数字（例如：2000）。不要包含任何解释或文字。
  `;

  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
      config: {
        responseMimeType: "text/plain",
      }
    });
    const text = response.text?.trim();
    const calories = parseInt(text || "2000");
    return isNaN(calories) ? 2000 : calories;
  } catch (error) {
    console.error("Calorie Calculation Error:", error);
    return 2000; // Default fallback
  }
};

/**
 * Analyzes a food image to extract nutritional info and suitability.
 */
export const analyzeFoodImage = async (
  base64Image: string,
  userProfile: UserProfile,
  todaysLogs: FoodLogEntry[]
): Promise<FoodAnalysisResult> => {
  
  const todayCalories = todaysLogs.reduce((acc, log) => acc + log.analysis.calories, 0);

  const prompt = `
    分析这张图片。识别食物项目。
    确定图片内容是否为可食用物品？
    考虑到用户的当前身体状况：“${userProfile.baseHealthCondition}”和感受：“${userProfile.currentFeeling}”，它是否适合食用？
    具体来说，基于当天的饮食记录（当前总热量：${todayCalories} / 目标：${userProfile.calorieTarget}），是否仍可食用？
    
    返回一个 JSON 对象。不要使用 Markdown 格式。
    请确保 'explanation' 字段使用中文回答。
    'protein', 'carbs', 'fat' 字段请包含单位（如 '20g'）。
  `;

  try {
    const response = await ai.models.generateContent({
      model: VISION_MODEL,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/jpeg",
              data: base64Image,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            foodName: { type: Type.STRING, description: "食物名称(中文)" },
            calories: { type: Type.INTEGER },
            protein: { type: Type.STRING },
            carbs: { type: Type.STRING },
            fat: { type: Type.STRING },
            ifsuitable: { type: Type.BOOLEAN },
            ifsuitabletoday: { type: Type.BOOLEAN },
            explanation: { type: Type.STRING, description: "中文解释" },
          },
          required: ["foodName", "calories", "protein", "carbs", "fat", "ifsuitable", "ifsuitabletoday", "explanation"],
        },
      },
    });

    if (response.text) {
      return JSON.parse(response.text) as FoodAnalysisResult;
    }
    throw new Error("No data returned from Gemini");
  } catch (error) {
    console.error("Gemini Vision Error:", error);
    throw new Error("图片分析失败，请重试。");
  }
};

/**
 * Generates a meal plan based on health status.
 */
export const generateMealPlans = async (userProfile: UserProfile): Promise<string> => {
  const prompt = `
    你是一位专业的营养师。
    用户资料：
    - 身体状况：${userProfile.baseHealthCondition}
    - 当前感受：${userProfile.currentFeeling}
    - 目标：${userProfile.goal}
    - 热量目标：${userProfile.calorieTarget}

    请为今天生成三份独特的膳食计划选项（选项 A、选项 B、选项 C），分别代表早餐、午餐和晚餐的建议。
    使它们简洁但开胃。清晰地格式化回复。请用中文回答。
  `;

  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
    });
    return response.text || "无法生成计划。";
  } catch (error) {
    console.error("Gemini Plan Error:", error);
    return "抱歉，我现在无法生成计划。";
  }
};

/**
 * Chat with the AI about health/nutrition.
 */
export const chatWithHealthBot = async (history: {role: string, parts: {text: string}[]}[], message: string): Promise<string> => {
  try {
    const chat = ai.chats.create({
      model: TEXT_MODEL,
      history: history,
      config: {
        systemInstruction: "你是一个名为 Silk Kcal 的乐于助人、富有同情心且知识渊博的健康助手。请始终用中文与用户交流。",
      }
    });

    const response = await chat.sendMessage({ message });
    return response.text || "";
  } catch (error) {
    console.error("Gemini Chat Error:", error);
    return "连接服务器时出现问题。";
  }
};

/**
 * Analyzes the complete daily log.
 */
export const analyzeDailyLog = async (logs: FoodLogEntry[], userProfile: UserProfile): Promise<string> => {
  const logSummary = logs.map(l => `${l.type}: ${l.analysis.foodName} (${l.analysis.calories}kcal)`).join('\n');
  const totalCalories = logs.reduce((acc, l) => acc + l.analysis.calories, 0);

  const prompt = `
    分析今天的完整饮食。
    用户目标：${userProfile.goal} (${userProfile.calorieTarget} 千卡/天)。
    已摄入：${totalCalories} 千卡。
    日志：
    ${logSummary}

    提供营养摄入总结、具体的改进建议以及是否达成目标。保持鼓励但实事求是。请用中文回答。
  `;

  try {
    const response = await ai.models.generateContent({
      model: TEXT_MODEL,
      contents: prompt,
    });
    return response.text || "分析失败。";
  } catch (error) {
    console.error("Daily Analysis Error:", error);
    return "无法分析今日日志。";
  }
};