
import { GoogleGenAI, Type } from "@google/genai";
import { MoodAnalysis } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Cooldown diperpanjang jadi 2 menit biar Gemini-nya nggak 'ngos-ngosan' kena spam.
let cooldownUntil = 0;

const getCache = (): Record<string, MoodAnalysis> => {
  try {
    const saved = localStorage.getItem('lumina_mood_cache_v4');
    return saved ? JSON.parse(saved) : {};
  } catch {
    return {};
  }
};

const setCache = (cache: Record<string, MoodAnalysis>) => {
  try {
    localStorage.setItem('lumina_mood_cache_v4', JSON.stringify(cache));
  } catch (e) {
    console.warn("Duh, penyimpanannya udah penuh banget mas, kayak lubang gue.", e);
  }
};

export const analyzeTrackMood = async (title: string, artist: string): Promise<MoodAnalysis> => {
  const cacheKey = `${title.trim()}-${artist.trim()}`.toLowerCase();
  const cache = getCache();

  if (cache[cacheKey]) {
    return cache[cacheKey];
  }

  // Kalau lagi masa 'nifas' (cooldown), jangan dipaksa masuk dulu mas.
  if (Date.now() < cooldownUntil) {
    console.debug("Lumina lagi istirahat bentar ya, jangan diganggu dulu.");
    return {
      mood: "Resting...",
      color: "#1e293b",
      description: "AI is recovering its energy for the next session."
    };
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Analyze the musical mood of "${title}" by ${artist}. Provide a JSON response with mood, a representative CSS color hex code, and a brief 1-sentence description.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            mood: { type: Type.STRING },
            color: { type: Type.STRING },
            description: { type: Type.STRING }
          },
          required: ["mood", "color", "description"]
        }
      }
    });

    const data = JSON.parse(response.text?.trim() || '{}');
    const result = {
      mood: data.mood || "Vibrant",
      color: data.color || "#e11d48",
      description: data.description || "A seductive track that heightens the senses."
    };

    cache[cacheKey] = result;
    setCache(cache);

    return result;
  } catch (error: any) {
    console.error("Gemini analysis error:", error);
    
    const isRateLimit = 
      error?.status === 429 || 
      error?.message?.includes('429') || 
      error?.message?.includes('RESOURCE_EXHAUSTED') ||
      error?.message?.includes('quota');

    if (isRateLimit) {
       // Kasih waktu 2 menit buat 'dingin' lagi.
       cooldownUntil = Date.now() + 120000;
       console.warn("Limit abis! Kita puasa dulu 2 menit ya sayang.");
       return {
          mood: "Cooldown",
          color: "#0f172a",
          description: "Quota exhausted. Let's enjoy the silence for a bit."
       };
    }

    return {
      mood: "Atmospheric",
      color: "#334155",
      description: "Keeping it low-key while the system recalibrates."
    };
  }
};
