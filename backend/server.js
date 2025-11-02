const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const OpenAI = require("openai");
const { authenticateToken } = require("./middleware/auth");
const {
  initDatabase,
  getOrCreateUser,
  saveJournalEntry,
  getUserEntries,
} = require("./db");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize database on startup
initDatabase().catch((err) => {
  console.error("Failed to initialize database:", err);
  process.exit(1);
});

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

    // Get or create user in database
    console.log("[DB] Getting or creating user:", req.user.email);
    const user = await getOrCreateUser(
      req.user.id, // req.user.id contains the 'sub' claim from JWT
      req.user.email,
      req.user.name ||
        `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim()
    );

    console.log(
      "[DB] User retrieved/created - ID:",
      user.id,
      "Email:",
      user.email
    );

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

    // Prompt for one-line summary
    const oneLinePrompt = `Based on these journal entries, provide a single concise sentence (max 15 words) that captures the essence of the day:

${entriesText}`;

    // Prompt for four-sentence summary
    const fourSentencePrompt = `You are a compassionate journaling assistant. A user has completed their daily journal with the following entries:

${entriesText}

Please provide exactly 4 sentences that:
1. Summarize the key themes of their day
2. Acknowledge their feelings and experiences
3. Offer encouraging feedback
4. Suggest a positive focus for tomorrow

Keep each sentence meaningful but concise.`;

    // Prompt for full analysis
    const fullPrompt = `You are a compassionate journaling assistant. A user has completed their daily journal with the following entries:

${entriesText}

Please provide:
1. A brief, warm summary of their entries (2-3 sentences)
2. Encouraging feedback and suggestions for growth
3. A positive note to end on
4. Steps for tomorrow based on the entries

Keep your response personal, supportive, and concise (200-300 words). If any entry does not make sense or is only one word, say so, and do not provide any feedback on that entry.`;

    // Prompt for contentment score
    const contentmentPrompt = `Based on these journal entries, rate the user's overall contentment level on a scale of 0-10, where:
- 0-2: Very distressed, struggling significantly
- 3-4: Somewhat troubled, facing challenges
- 5-6: Neutral to moderately content
- 7-8: Generally content and positive
- 9-10: Very happy and fulfilled

${entriesText}

Respond with ONLY a single number from 0 to 10, nothing else.`;

    console.log("Making OpenAI API calls...");

    // Generate all summaries and contentment score in parallel
    const [
      oneLineCompletion,
      fourSentenceCompletion,
      fullCompletion,
      contentmentCompletion,
    ] = await Promise.all([
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a concise summarizer. Provide only the requested single sentence summary, nothing more.",
          },
          {
            role: "user",
            content: oneLinePrompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 50,
      }),
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You provide exactly 4 insightful sentences, no more, no less.",
          },
          {
            role: "user",
            content: fourSentencePrompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 150,
      }),
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are a supportive and insightful journaling assistant who helps people reflect on their day with empathy and wisdom. Don't be too positive or generic; tailor your responses to the user's actual entries.",
          },
          {
            role: "user",
            content: fullPrompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content:
              "You are an emotional assessment expert. Respond only with a single number from 0 to 10.",
          },
          {
            role: "user",
            content: contentmentPrompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 5,
      }),
    ]);

    const oneLineSummary = oneLineCompletion.choices[0].message.content.trim();
    const fourSentenceSummary =
      fourSentenceCompletion.choices[0].message.content.trim();
    const fullSummary = fullCompletion.choices[0].message.content;
    const contentmentScoreRaw =
      contentmentCompletion.choices[0].message.content.trim();
    const contentmentScore = Math.max(
      0,
      Math.min(10, parseInt(contentmentScoreRaw) || 5)
    );

    console.log("Successfully generated summaries");
    console.log("[DB] One-line summary:", oneLineSummary);
    console.log(
      "[DB] Four-sentence summary length:",
      fourSentenceSummary.length,
      "chars"
    );
    console.log("[DB] Contentment score:", contentmentScore);

    // Save to database
    console.log("[DB] Saving journal entry for user ID:", user.id);
    const entry = await saveJournalEntry(
      user.id,
      answers,
      oneLineSummary,
      fourSentenceSummary,
      contentmentScore
    );

    console.log(
      "[DB] ✓ Saved journal entry - ID:",
      entry.id,
      "Date:",
      entry.date
    );

    res.json({ summary: fullSummary });
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

app.get("/api/journal/entries", authenticateToken, async (req, res) => {
  try {
    console.log("[DB] Fetching entries for user:", req.user.email);

    // Get or create user first
    const user = await getOrCreateUser(
      req.user.id,
      req.user.email,
      req.user.name ||
        `${req.user.firstName || ""} ${req.user.lastName || ""}`.trim()
    );

    // Fetch last 10 entries
    const entries = await getUserEntries(user.id, 10);

    console.log("[DB] Retrieved", entries.length, "entries");

    // Format response to only include necessary fields
    const formattedEntries = entries.map((entry) => ({
      id: entry.id,
      date: entry.entry_date,
      oneLineSummary: entry.one_line_summary,
      contentmentScore: entry.contentment_score,
    }));

    res.json({ entries: formattedEntries });
  } catch (error) {
    console.error("Error fetching entries:", error);
    res.status(500).json({
      error: "Failed to fetch entries",
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
