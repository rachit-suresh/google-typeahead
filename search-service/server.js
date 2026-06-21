import express from 'express';
import cors from 'cors';

const app = express();
const PORT = 8081;

// Enable CORS for frontend Vite application
app.use(cors({
  origin: 'http://localhost:5173'
}));

app.use(express.json());

app.post('/search/submit', async (req, res) => {
  const { query } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  console.log(`[Search Service] Received search: "${query}". Forwarding to Typeahead Service...`);

  try {
    const response = await fetch('http://localhost:8080/typeahead/record', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query })
    });

    if (!response.ok) {
      throw new Error(`Typeahead service returned status: ${response.status}`);
    }

    console.log(`[Search Service] Successfully registered search count update for: "${query}"`);
    res.json({ message: 'Searched' });
  } catch (err) {
    console.error('[Search Service] Failed to call Typeahead service:', err.message);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`[Search Service] Listening on port ${PORT}`);
});
