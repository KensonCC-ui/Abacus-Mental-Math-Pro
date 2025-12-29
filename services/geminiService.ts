
import { GoogleGenAI } from "@google/genai";

export async function getAiTip(question: string, userValue: number, targetValue: number) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `我在練習珠心算。題目是 "${question}"。
      我撥出的答案是 ${userValue}，但正確答案應該是 ${targetValue}。
      請給我一個簡短的鼓勵，並解釋一個珠心算的小技巧或口訣，幫助我下次做得更好。
      請用親切的口氣，像是一個珠心算老師在教小朋友。不要超過 100 字。`,
    });
    return response.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    return "加油！珠心算需要多加練習，相信你下次一定能撥對。記得檢查口訣喔！";
  }
}

export async function explainFormula(formula: string) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `請向一個珠心算初學者解釋口訣「${formula}」的意思和撥法。
      口語化且有趣，像是在說故事。`,
    });
    return response.text;
  } catch (error) {
    return "這個口訣是珠心算的精髓，多練習幾次就會上手囉！";
  }
}
