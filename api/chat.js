export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, model, temperature } = req.body;
  const sitePassword = req.headers['x-site-password'];

  // 1. Security Check: Verify Password
  if (sitePassword !== process.env.SITE_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized: Incorrect Site Password' });
  }

  // 2. Security Check: Verify API Key exists on server
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Server Error: OPENROUTER_API_KEY not configured' });
  }

  try {
    // 3. Proxy Request to OpenRouter
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://pa-trainer.vercel.app', // Optional: customize
        'X-Title': 'PA Trainer',
      },
      body: JSON.stringify({
        model: model || "google/gemini-2.0-flash-001",
        messages,
        temperature: temperature || 0.7,
      }),
    });

    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return res.status(response.status).json({ 
            error: errorData.error?.message || `OpenRouter Error: ${response.status}` 
        });
    }

    const data = await response.json();
    return res.status(200).json(data);

  } catch (error) {
    console.error('Proxy Error:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
