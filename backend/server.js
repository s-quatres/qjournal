const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const OpenAI = require("openai");
const { authenticateToken } = require("./middleware/auth");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Add logging middleware to see all incoming requests
app.use((req, res, next) => {
  console.log(
    `${new Date().toISOString()} - ${req.method} ${
      req.path
    } - Headers: ${JSON.stringify(req.headers.accept)}`
  );
  next();
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post("/api/journal/analyze", authenticateToken, async (req, res) => {
  console.log("=== Journal Analysis Request ===");
  console.log("Request URL:", req.url);
  console.log("Request method:", req.method);
  console.log("Authenticated user:", req.user.email, req.user.firstName);
  console.log("Received request body:", req.body);

  try {
    const { answers } = req.body;

    if (!answers) {
      console.log("ERROR: Missing answers in request body");
      return res.status(400).json({ error: "Answers are required" });
    }

    console.log("Processing answers:", Object.keys(answers));

    // Dynamically build the entries section from whatever fields are present
    const entriesText = Object.entries(answers)
      .filter(([_, value]) => value && value.trim().length > 0)
      .map(([key, value]) => {
        // Convert camelCase to Title Case (e.g., "mood" -> "Mood", "tomorrowsFocus" -> "Tomorrows Focus")
        const label =
          key.charAt(0).toUpperCase() +
          key
            .slice(1)
            .replace(/([A-Z])/g, " $1")
            .trim();
        return `${label}: ${value}`;
      })
      .join("\n");

    const prompt = `You are a compassionate journaling assistant. A user has completed their daily journal with the following entries:

${entriesText}

Please provide:
1. A one line description of the day.
2. A brief, warm summary of their entries (2-3 sentences)
4. Encouraging feedback and suggestions for growth
5. A positive note to end on
6. Steps for tomorrow based on the entries

Keep your response personal, supportive, and concise (200-300 words). If any entry does not make sense, say so, and do not provide any feedback on that entry.`;

    console.log("Making OpenAI API call...");
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a supportive and insightful journaling assistant who helps people reflect on their day with empathy and wisdom. Don't be too positive or generic; tailor your responses to the user's actual entries.",
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

  // If this is a request for static assets, return 404 with proper headers
  if (
    req.path.startsWith("/assets/") ||
    req.path.endsWith(".js") ||
    req.path.endsWith(".css") ||
    req.path.endsWith(".map") ||
    req.path.endsWith(".ico") ||
    req.path.endsWith(".png") ||
    req.path.endsWith(".svg")
  ) {
    console.log(
      `WARNING: Static asset ${req.path} was routed to backend - this indicates ingress misconfiguration`
    );
    return res
      .status(404)
      .send("Static asset not found - check ingress configuration");
  }

  res.status(404).json({
    error: "Route not found",
    requestedPath: req.path,
    availableRoutes: ["/api/journal/analyze", "/health"],
  });
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
