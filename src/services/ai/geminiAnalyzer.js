import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

export const generateViolationSummary = async (violations) => {
  if (!API_KEY) {
    return "Gemini API key not configured. Summary unavailable.";
  }
  
  if (!violations || violations.length === 0) {
    return "No suspicious behavior detected during the session.";
  }

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  
  const prompt = `You are an AI Proctoring Analyst. Review the following violation logs from an exam attempt. Provide two things:
1. Cheating Probability (e.g. 80%)
2. A single, succinct sentence summarizing the suspicious behavior.

Violations:
${JSON.stringify(violations)}

Summary format exactly like this:
Cheating Probability: [Percentage]
Summary: [Sentence]`;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text().trim();
  } catch (error) {
    console.error("Gemini Error:", error);
    return "Unable to generate summary due to an error.";
  }
};
