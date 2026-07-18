/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";

dotenv.config();

const app = express();
const PORT = 3000;

// Rate limiting for the AI endpoint
const scanLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit each IP to 20 requests per windowMs
  message: { error: "Too many scan requests from this IP, please try again after 15 minutes", isFallback: true }
});

// Increase request payload limit for image uploads
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ limit: "15mb", extended: true }));

// Initialize Gemini client if API key is present
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
  console.log("Gemini AI client initialized successfully.");
} else {
  console.log("Warning: GEMINI_API_KEY is not defined. AI scanning will fall back to demo mode.");
}

// API Route: Scan Receipt
app.post("/api/scan-receipt", scanLimiter, async (req, res) => {
  try {
    const { imageBase64, mimeType } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Missing imageBase64 payload" });
    }

    if (!ai) {
      return res.status(503).json({ 
        error: "Gemini API key is not configured on the server. Please check Settings > Secrets.",
        isFallback: true 
      });
    }

    // Clean base64 string
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const prompt = "Analyze this receipt, invoice, or bill image. Extract the following details: " +
      "1. Merchant or store name (string)" +
      "2. Total amount (positive float number) " +
      "3. Category (must be one of: 'Food & Dining', 'Rent', 'Salary', 'Shopping', 'Travel', 'Utilities', 'Miscellaneous')" +
      "4. Date in YYYY-MM-DD format (or fallback to today if not clear)" +
      "5. Time in HH:MM AM/PM format" +
      "6. Payment method used (e.g. 'Chase Visa', 'Amex Platinum', 'Cash', 'Checking Acct')" +
      "7. A brief list of item descriptions (array of strings)";

    console.log("Calling Gemini API model gemini-3.5-flash for OCR...");

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: mimeType || "image/jpeg",
            data: base64Data,
          },
        },
        prompt
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            merchant: { type: Type.STRING },
            amount: { type: Type.NUMBER },
            category: { type: Type.STRING },
            date: { type: Type.STRING, description: "YYYY-MM-DD format" },
            time: { type: Type.STRING, description: "HH:MM AM/PM format" },
            paymentMethod: { type: Type.STRING },
            items: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          },
          required: ["merchant", "amount", "category", "date", "time", "paymentMethod"]
        }
      }
    });

    let textResult = response.text || "";
    if (!textResult) {
      throw new Error("Empty response received from Gemini.");
    }
    // Clean up potential markdown formatting from AI response
    textResult = textResult.replace(/^```json\s*/i, "").replace(/```\s*$/i, "").trim();

    let parsedData;
    try {
      parsedData = JSON.parse(textResult);
    } catch (parseError) {
      console.error("Failed to parse JSON from AI response:", textResult);
      throw new Error("Invalid response format from AI");
    }

    console.log("Extracted transaction data successfully:", parsedData);
    
    return res.json(parsedData);
  } catch (error: any) {
    console.error("Receipt scanning error:", error);
    return res.status(500).json({ 
      error: error.message || "Failed to scan receipt image", 
      details: error.stack 
    });
  }
});

// Setup dev server or static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
    console.log("Vite development middleware integrated.");
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
    console.log("Static production assets configured from /dist.");
  }

  if (process.env.VERCEL !== "1") {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://0.0.0.0:${PORT}`);
    });
  }
}

startServer();
export default app;
