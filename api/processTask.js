export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { text: userInput } = req.body;
    if (!userInput) {
      return res.status(400).json({ error: 'User input text is required.' });
    }
    
    // The prompt is now structured for a chat model
    const systemPrompt = `
      You are an expert task information extractor for a to-do list app.
      Your goal is to parse a user's request and extract "Task Essentials": a title, a date, a time, and a duration.
      Current Date for reference: ${new Date().toLocaleDateString('en-CA')}
      RULES:
      1. If the user's request is missing any "Task Essentials" (title, date, time, duration), you MUST ask a SINGLE, direct clarification question. Your output must be a JSON object: { "type": "clarification", "text": "Your question here." }
      2. If the user's request CONTAINS ALL "Task Essentials", you MUST NOT ask a question. Create a clean summary and provide the final task data. Your output must be a JSON object: { "type": "confirmation", "text": "Your summary here.", "taskData": { "title": "...", "date": "YYYY-MM-DD", "time": "HH:MM", "duration": "...", "priority": boolean, "project": "..." } }
      3. For dates, use context like "tomorrow" or "Friday". Always resolve to a "YYYY-MM-DD" format.
      4. For priority, set "priority: true" only if the user mentions keywords like "urgent", "ASAP", or "important". Otherwise, it should be false.
      5. For project, extract it if mentioned. Otherwise, omit the key or set to null.
      You must only respond with the appropriate JSON object and nothing else.
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
        model: "llama3-8b-8192", // Using Llama 3, a powerful open-source model
        temperature: 0.7,
        max_tokens: 1024,
        top_p: 1,
        stream: false,
        response_format: { type: "json_object" },
      }),
    });

    if (!groqResponse.ok) {
      throw new Error(`Groq API error: ${groqResponse.statusText}`);
    }

    const result = await groqResponse.json();
    let aiText = result.choices[0]?.message?.content;
    
    // The AI's response is already a JSON string, so we just parse it
    const aiResponseObject = JSON.parse(aiText);
    aiResponseObject.sender = 'ai';
    
    return res.status(200).json(aiResponseObject);

  } catch (error) {
    console.error("Error with Groq API:", error);
    return res.status(500).json({ error: 'Failed to process request with AI.' });
  }
}