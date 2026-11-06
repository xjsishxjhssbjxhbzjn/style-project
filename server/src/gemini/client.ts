import { GoogleGenerativeAI } from '@google/generative-ai';
import { buildSystemPrompt } from '../prompts/systemPrompt.js';

let genAI: GoogleGenerativeAI | null = null;

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY);
}

function getApiKey(): string | null {
  return process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY || null;
}

export function getModelName(): string {
  return process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';
}

export function getGenerativeModel() {
  const key = getApiKey();
  if (!key) return null;
  if (!genAI) {
    genAI = new GoogleGenerativeAI(key);
  }
  return genAI.getGenerativeModel({
    model: getModelName(),
    systemInstruction: buildSystemPrompt(),
  });
}
