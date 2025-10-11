const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const OpenAI = require('openai');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.post('/api/journal/analyze', async (req, res) => {
  try {
    const { answers } = req.body;

    if (!answers) {
      return res.status(400).json({ error: 'Answers are required' });
    }

    const prompt = `You are a compassionate journaling assistant. A user has completed their daily journal with the following entries:

Mood: ${answers.mood}
Gratitude: ${answers.gratitude}
Challenges: ${answers.challenges}
Achievements: ${answers.achievements}
Tomorrow's Focus: ${answers.tomorrow}

Please provide:
1. A brief, warm summary of their day (2-3 sentences)
2. Thoughtful insights about patterns or themes you notice
3. Encouraging feedback and suggestions for growth
4. A positive note to end on

Keep your response personal, supportive, and concise (200-300 words).`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a supportive and insightful journaling assistant who helps people reflect on their day with empathy and wisdom.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const summary = completion.choices[0].message.content;

    res.json({ summary });
  } catch (error) {
    console.error('OpenAI API Error:', error);
    res.status(500).json({ 
      error: 'Failed to generate summary',
      details: error.message 
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
