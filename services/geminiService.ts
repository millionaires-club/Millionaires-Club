
import { GoogleGenAI } from "@google/genai";

export const callGemini = async (prompt: string): Promise<string> => {
  // SECURITY FIX: Strictly use environment variable. Do not add fallbacks here.
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    console.error("Gemini API Key is missing. AI features will be disabled.");
    return "AI Service Unavailable: API Key missing.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    return response.text || "No response generated.";
  } catch (error) {
    console.error("AI Error:", error);
    return "Error calling AI service. Please try again.";
  }
};
