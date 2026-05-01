import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export interface HomeworkEvaluation {
  score: number;
  feedback: string;
  grammar: string;
  accuracy: string;
  completeness: string;
}

export async function evaluateHomework(
  homeworkTitle: string, 
  homeworkDescription: string, 
  studentSubmission: string
): Promise<HomeworkEvaluation> {
  const prompt = `
    Evaluation Task:
    Homework Title: ${homeworkTitle}
    Assignment Description: ${homeworkDescription}
    Student Submission: ${studentSubmission}

    Please evaluate this submission based on accuracy, grammar, and completeness.
    Provide a score between 0 and 10.
  `;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction: `
        You are an AI Teaching Assistant. 
        Evaluate student homework objectively.
        Return your evaluation in JSON format.
        Follow this schema:
        {
          "score": number (0-10),
          "feedback": string (general summary),
          "grammar": string (critique of grammar/writing),
          "accuracy": string (critique of factual accuracy/correctness),
          "completeness": string (critique of how well all requirements were met)
        }
      `,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          score: { type: Type.NUMBER },
          feedback: { type: Type.STRING },
          grammar: { type: Type.STRING },
          accuracy: { type: Type.STRING },
          completeness: { type: Type.STRING }
        },
        required: ["score", "feedback", "grammar", "accuracy", "completeness"]
      }
    }
  });

  if (!response.text) {
    throw new Error("AI failed to generate evaluation");
  }

  return JSON.parse(response.text.trim());
}
