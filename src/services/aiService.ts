import { GoogleGenAI } from "@google/genai";

// Initialization with environment variable
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function getLearningInsights(studentPerformanceData: any) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `You are an expert educational AI. Based on the student's data: ${JSON.stringify(studentPerformanceData)}, provide 3 specific learning recommendations and a brief performance analysis. Return as a clean JSON object with keys: 'recommendations' (array of strings) and 'analysis' (string).`,
      config: {
        responseMimeType: "application/json",
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("AI Insight Error:", error);
    return {
      recommendations: ["Consistent study sessions", "Participate more in class", "Review recent math homework"],
      analysis: "Steady progress observed, with room for improvement in quantitative subjects."
    };
  }
}
