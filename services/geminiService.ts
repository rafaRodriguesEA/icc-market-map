import { GoogleGenAI, Type } from "@google/genai";
import { Client, AIAnalysis } from '../types';

const API_KEY = process.env.API_KEY;

// Inicialização preguiçosa: criar o cliente no topo do módulo derruba o app
// inteiro (tela branca) quando a API key não está configurada, pois o SDK
// lança erro ao ser instanciado no navegador sem chave.
let aiClient: GoogleGenAI | null = null;

const getClient = (): GoogleGenAI => {
  if (!API_KEY) {
    throw new Error(
      "Chave da API Gemini não configurada. Defina GEMINI_API_KEY nas variáveis de ambiente."
    );
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({ apiKey: API_KEY });
  }
  return aiClient;
};

export const isAiEnabled = (): boolean => Boolean(API_KEY);

export const generateCommercialStrategy = async (client: Client): Promise<AIAnalysis> => {
  const ai = getClient();
  const model = "gemini-3-flash-preview";
  
  const prompt = `
    Atue como um Diretor Comercial Sênior especialista em Nutrição Animal (ICC Animal Nutrition).
    Analise o seguinte cliente e forneça uma estratégia curta e direta para aumentar o "share of wallet" ou fechar o negócio.
    
    Cliente: ${client.companyName}
    Segmento: ${client.segment}
    Status Atual: ${client.status}
    Valor Potencial: $${client.potentialValue}
    Notas: ${client.notes}
    
    Retorne a resposta estritamente em JSON.
  `;

  const response = await ai.models.generateContent({
    model: model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          strategy: { type: Type.STRING, description: "Uma estratégia comercial resumida em 2 frases." },
          talkingPoints: { 
            type: Type.ARRAY, 
            items: { type: Type.STRING },
            description: "3 pontos chaves técnicos ou comerciais para abordar na próxima reunião."
          },
          riskAssessment: { type: Type.STRING, description: "Análise de risco de perda ou não fechamento." }
        },
        required: ["strategy", "talkingPoints", "riskAssessment"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from Gemini");
  
  return JSON.parse(text) as AIAnalysis;
};
