
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getNextAutonomousActions = async (
  currentWindows: string[],
  screenSize: { width: number, height: number }
) => {
  const prompt = `
    You are an autonomous cursor agent controlling a virtual desktop.
    The desktop has these elements: ${currentWindows.join(', ')}.
    The screen resolution is ${screenSize.width}x${screenSize.height}.
    
    Generate a sequence of 3-5 actions for the cursor to perform.
    Actions can be:
    - MOVE: Move to a specific (x, y) or window target.
    - CLICK: Click the current position or a target.
    - DRAW: A series of points representing a shape on the 'Whiteboard'.
    
    Make the behavior look curious and purposeful.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            actions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  type: { type: Type.STRING, enum: ['MOVE', 'CLICK', 'DRAW'] },
                  target: { type: Type.STRING },
                  position: {
                    type: Type.OBJECT,
                    properties: {
                      x: { type: Type.NUMBER },
                      y: { type: Type.NUMBER }
                    },
                    required: ['x', 'y']
                  },
                  path: {
                    type: Type.ARRAY,
                    items: {
                      type: Type.OBJECT,
                      properties: {
                        x: { type: Type.NUMBER },
                        y: { type: Type.NUMBER }
                      },
                      required: ['x', 'y']
                    }
                  },
                  label: { type: Type.STRING }
                },
                required: ['type']
              }
            }
          },
          required: ['actions']
        }
      }
    });

    const data = JSON.parse(response.text);
    return data.actions;
  } catch (error) {
    console.error("Gemini failed to generate intent:", error);
    return [];
  }
};
