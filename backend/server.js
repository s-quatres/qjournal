const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const OpenAI = require("openai");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/api/journal/analyze", async (req, res) => {
  console.log("=== Journal Analysis Request ===");
  console.log("Request URL:", req.url);
  console.log("Request method:", req.method);
  console.log("Request headers:", req.headers);
  console.log("Received request body:", req.body);

  try {
    const { answers } = req.body;

    if (!answers) {
      console.log("ERROR: Missing answers in request body");
      return res.status(400).json({ error: "Answers are required" });
    }

    console.log("Processing answers:", Object.keys(answers));

    const prompt = `You are a compassionate journaling assistant. A user has completed their daily journal with the following entries:

Mood: ${answers.mood}
Gratitude: ${answers.gratitude}
Challenges: ${answers.challenges}
Achievements: ${answers.achievements}
Tomorrow's Focus: ${answers.tomorrow}

Please provide:
1. A brief, warm summary of their entries (2-3 sentences)
2. Thoughtful insights about patterns or themes you notice
3. Encouraging feedback and suggestions for growth
4. A positive note to end on
5. Steps for tomorrow based on the entries

Keep your response personal, supportive, and concise (200-300 words).`;

    console.log("Making OpenAI API call...");
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a supportive and insightful journaling assistant who helps people reflect on their day with empathy and wisdom.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const summary = completion.choices[0].message.content;
    console.log("Successfully generated summary");

    res.json({ summary });
  } catch (error) {
    console.error("=== ERROR in journal analysis ===");
    console.error("Error type:", error.constructor.name);
    console.error("Error message:", error.message);
    console.error("Full error:", error);
    res.status(500).json({
      error: "Failed to generate summary: " + error.message,
      details: error.message,
    });
  }
});

app.get("/health", (req, res) => {
  res.json({ status: "healthy" });
});

// Add a root route to handle any misrouted requests
app.all("/", (req, res) => {
  console.log(
    `Received ${req.method} request to root path. This might indicate a routing issue.`
  );
  res.status(404).json({
    error: "Route not found",
    message: "Use /api/journal/analyze for journal analysis",
    availableRoutes: ["/api/journal/analyze", "/health"],
  });
});

// Catch-all route for undefined routes
app.all("*", (req, res) => {
  console.log(`Received ${req.method} request to undefined route: ${req.path}`);
  res.status(404).json({
    error: "Route not found",
    requestedPath: req.path,
    availableRoutes: ["/api/journal/analyze", "/health"],
  });
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
