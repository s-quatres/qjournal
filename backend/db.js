const { Pool } = require("pg");

const pool = new Pool({
  host: process.env.DATABASE_HOST || "localhost",
  port: process.env.DATABASE_PORT || 5432,
  database: process.env.DATABASE_NAME || "qjournal",
  user: process.env.DATABASE_USER || "postgres",
  password: process.env.DATABASE_PASSWORD,
});

// Initialize database schema
async function initDatabase() {
  const client = await pool.connect();
  try {
    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        keycloak_sub VARCHAR(255) UNIQUE NOT NULL,
        email VARCHAR(255),
        name VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create journal_entries table
    await client.query(`
      CREATE TABLE IF NOT EXISTS journal_entries (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
        answers JSONB NOT NULL,
        one_line_summary TEXT,
        four_sentence_summary TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, entry_date)
      )
    `);

    // Create index on user_id and entry_date for faster queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_journal_entries_user_date 
      ON journal_entries(user_id, entry_date DESC)
    `);

    console.log("Database schema initialized successfully");
  } catch (error) {
    console.error("Error initializing database:", error);
    throw error;
  } finally {
    client.release();
  }
}

// Get or create user by Keycloak subject
async function getOrCreateUser(keycloakSub, email, name) {
  const client = await pool.connect();
  try {
    console.log("[DB] Querying for user with keycloak_sub:", keycloakSub);
    // Try to find existing user
    let result = await client.query(
      "SELECT * FROM users WHERE keycloak_sub = $1",
      [keycloakSub]
    );

    if (result.rows.length > 0) {
      console.log(
        "[DB] Found existing user - ID:",
        result.rows[0].id,
        "Email:",
        result.rows[0].email
      );
      return result.rows[0];
    }

    // Create new user
    console.log("[DB] Creating new user - Email:", email, "Name:", name);
    result = await client.query(
      "INSERT INTO users (keycloak_sub, email, name) VALUES ($1, $2, $3) RETURNING *",
      [keycloakSub, email, name]
    );

    console.log("[DB] ✓ Created new user - ID:", result.rows[0].id);
    return result.rows[0];
  } finally {
    client.release();
  }
}

// Save journal entry
async function saveJournalEntry(
  userId,
  answers,
  oneLineSummary,
  fourSentenceSummary,
  contentmentScore
) {
  const client = await pool.connect();
  try {
    console.log("[DB] Saving journal entry for user ID:", userId);
    console.log("[DB] Answers keys:", Object.keys(answers).join(", "));
    console.log("[DB] Contentment score:", contentmentScore);
    const result = await client.query(
      `INSERT INTO journal_entries (user_id, answers, one_line_summary, four_sentence_summary, contentment_score)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, entry_date) 
       DO UPDATE SET 
         answers = EXCLUDED.answers,
         one_line_summary = EXCLUDED.one_line_summary,
         four_sentence_summary = EXCLUDED.four_sentence_summary,
         contentment_score = EXCLUDED.contentment_score,
         created_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [
        userId,
        JSON.stringify(answers),
        oneLineSummary,
        fourSentenceSummary,
        contentmentScore,
      ]
    );
    console.log(
      "[DB] ✓ Journal entry saved - ID:",
      result.rows[0].id,
      "Date:",
      result.rows[0].entry_date,
      "Contentment:",
      result.rows[0].contentment_score
    );
    return result.rows[0];
  } finally {
    client.release();
  }
}

// Get user's journal entries
async function getUserEntries(userId, limit = 30) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT * FROM journal_entries 
       WHERE user_id = $1 
       ORDER BY entry_date DESC 
       LIMIT $2`,
      [userId, limit]
    );
    return result.rows;
  } finally {
    client.release();
  }
}

module.exports = {
  pool,
  initDatabase,
  getOrCreateUser,
  saveJournalEntry,
  getUserEntries,
};
