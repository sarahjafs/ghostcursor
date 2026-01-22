
import { GoogleGenAI, Type } from "@google/genai";

// We initialize the AI inside the service call to ensure process.env.API_KEY is available 
// and doesn't cause a top-level ReferenceError if 'process' isn't shimmed in time.
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

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
    
    Make the behavior look curious and purposeful. For MOVE, provide specific x,y coordinates or a window target name.
    For DRAW, provide a path of relative 0-1 coordinates for the whiteboard.
  `;

  try {
    const ai = getAI();
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
    // Return a default "wandering" move if AI fails
    return [{
      type: 'MOVE',
      position: { 
        x: Math.random() * screenSize.width, 
        y: Math.random() * screenSize.height 
      }
    }];
  }
};
