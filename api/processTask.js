export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { text: userInput } = req.body;
    if (!userInput) {
      return res.status(400).json({ error: 'User input text is required.' });
    }

    const systemPrompt = `
      You are an expert task information extractor... // The rest of your detailed prompt
      User Request: "${userInput}"
    `;

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userInput }
        ],
        model: "llama3-8b-8192", // Using the compatible model
        temperature: 0.7,
        max_tokens: 1024,
        top_p: 1,
        stream: false,
      }),
    });

    if (!groqResponse.ok) {
      const errorBody = await groqResponse.text();
      throw new Error(`Groq API error: ${groqResponse.statusText} - ${errorBody}`);
    }

    const result = await groqResponse.json();
    let aiText = result.choices[0]?.message?.content;

    aiText = aiText.replace(/```json/g, "").replace(/```/g, "").trim();
    const aiResponseObject = JSON.parse(aiText);
    aiResponseObject.sender = 'ai';

    return res.status(200).json(aiResponseObject);

  } catch (error) {
    console.error("Error with Groq API:", error);
    return res.status(500).json({ error: 'Failed to process request with AI.' });
  }
}