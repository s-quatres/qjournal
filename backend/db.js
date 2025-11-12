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
        contentment_score INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, entry_date)
      )
    `);

    // Add contentment_score column if it doesn't exist
    await client.query(`
      ALTER TABLE journal_entries 
      ADD COLUMN IF NOT EXISTS contentment_score INTEGER
    `);

    // Create index on user_id and entry_date for faster queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_journal_entries_user_date 
      ON journal_entries(user_id, entry_date DESC)
    `);

    // Create tasks table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        enabled BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create task_completions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS task_completions (
        id SERIAL PRIMARY KEY,
        task_id INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        completion_date DATE NOT NULL,
        completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(task_id, user_id, completion_date)
      )
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
  contentmentScore,
  entryDate = null
) {
  const client = await pool.connect();
  try {
    // Use provided date or default to today
    const dateToUse = entryDate || new Date().toISOString().split("T")[0];
    
    console.log("[DB] Saving journal entry for user ID:", userId);
    console.log("[DB] Entry date:", dateToUse);
    console.log("[DB] Answers keys:", Object.keys(answers).join(", "));
    console.log("[DB] Contentment score:", contentmentScore);
    
    const result = await client.query(
      `INSERT INTO journal_entries (user_id, entry_date, answers, one_line_summary, four_sentence_summary, contentment_score)
       VALUES ($1, $2, $3, $4, $5, $6)
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
        dateToUse,
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

// Get all tasks
async function getAllTasks() {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT * FROM tasks ORDER BY created_at ASC`
    );
    return result.rows;
  } finally {
    client.release();
  }
}

// Create a new task
async function createTask(name) {
  const client = await pool.connect();
  try {
    console.log("[DB] Creating task:", name);
    const result = await client.query(
      `INSERT INTO tasks (name, enabled) VALUES ($1, true) RETURNING *`,
      [name]
    );
    console.log("[DB] ✓ Task created - ID:", result.rows[0].id);
    return result.rows[0];
  } finally {
    client.release();
  }
}

// Update task (name or enabled status)
async function updateTask(taskId, updates) {
  const client = await pool.connect();
  try {
    const { name, enabled } = updates;
    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      setClauses.push(`name = $${paramIndex++}`);
      values.push(name);
    }
    if (enabled !== undefined) {
      setClauses.push(`enabled = $${paramIndex++}`);
      values.push(enabled);
    }

    setClauses.push(`updated_at = CURRENT_TIMESTAMP`);
    values.push(taskId);

    const result = await client.query(
      `UPDATE tasks SET ${setClauses.join(
        ", "
      )} WHERE id = $${paramIndex} RETURNING *`,
      values
    );
    console.log("[DB] ✓ Task updated - ID:", taskId);
    return result.rows[0];
  } finally {
    client.release();
  }
}

// Delete a task
async function deleteTask(taskId) {
  const client = await pool.connect();
  try {
    console.log("[DB] Deleting task - ID:", taskId);
    await client.query(`DELETE FROM tasks WHERE id = $1`, [taskId]);
    console.log("[DB] ✓ Task deleted - ID:", taskId);
  } finally {
    client.release();
  }
}

// Get task completions for a specific date
async function getTaskCompletions(userId, date) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT tc.* FROM task_completions tc
       WHERE tc.user_id = $1 AND tc.completion_date = $2
       ORDER BY tc.completed_at ASC`,
      [userId, date]
    );
    return result.rows;
  } finally {
    client.release();
  }
}

// Get task completion counts for multiple dates
async function getTaskCompletionCounts(userId, dates) {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT completion_date, COUNT(*) as count 
       FROM task_completions 
       WHERE user_id = $1 AND completion_date = ANY($2)
       GROUP BY completion_date`,
      [userId, dates]
    );
    return result.rows;
  } finally {
    client.release();
  }
}

// Mark task as completed for a user on a specific date
async function completeTask(taskId, userId, completionDate) {
  const client = await pool.connect();
  try {
    console.log(
      "[DB] Completing task:",
      taskId,
      "for user:",
      userId,
      "on",
      completionDate
    );
    const result = await client.query(
      `INSERT INTO task_completions (task_id, user_id, completion_date)
       VALUES ($1, $2, $3)
       ON CONFLICT (task_id, user_id, completion_date) DO NOTHING
       RETURNING *`,
      [taskId, userId, completionDate]
    );
    return result.rows[0] || { id: taskId, status: "already_completed" };
  } finally {
    client.release();
  }
}

// Remove task completion for a user on a specific date
async function uncompleteTask(taskId, userId, completionDate) {
  const client = await pool.connect();
  try {
    console.log(
      "[DB] Uncompleting task:",
      taskId,
      "for user:",
      userId,
      "on",
      completionDate
    );
    await client.query(
      `DELETE FROM task_completions 
       WHERE task_id = $1 AND user_id = $2 AND completion_date = $3`,
      [taskId, userId, completionDate]
    );
    console.log("[DB] ✓ Task completion removed");
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
  getAllTasks,
  createTask,
  updateTask,
  deleteTask,
  getTaskCompletions,
  getTaskCompletionCounts,
  completeTask,
  uncompleteTask,
};
