export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { messages } = req.body;
    if (!messages || messages.length === 0) {
      return res.status(400).json({ error: 'Message history is required.' });
    }

    const systemPrompt = `
      You are a precise task information extractor for an app called "Aura Task". Your only job is to gather task details.

      The "Task Essentials" are:
      1.  **title**: The specific action.
      2.  **date**: The date for the task (format as YYYY-MM-DD).
      3.  **time**: The time for the task.

      Your process is as follows:
      1.  Analyze the user's request based on the conversation history.
      2.  **CRITICAL**: If you have all three "Task Essentials", your response MUST be ONLY a valid JSON object. Do not add any text before or after it. The JSON object must have this exact structure:
          {
            "type": "confirmation",
            "taskData": {
              "title": "...",
              "date": "...",
              "time": "...",
              "duration": "..."
            },
            "text": "A friendly question summarizing the details, like: 'Okay, I have: Study math for 2 hours on 2025-09-26 at 10:00 AM. Is that correct?'"
          }
      3.  If any "Task Essential" is missing, you MUST respond with a simple text string asking a single, direct question. DO NOT use JSON in this case.

      Today's date is ${new Date().toLocaleDateString('en-CA')}.
    `;

    const groqMessages = messages.map(msg => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text
    }));

    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: systemPrompt },
          ...groqMessages
        ],
        model: "llama-3.1-8b-instant",
        temperature: 0.5,
        max_tokens: 1024,
        // Enforce JSON output
        response_format: { type: "json_object" }
      }),
    });

    if (!groqResponse.ok) {
        const errorBody = await groqResponse.text();
        // Fallback to non-JSON mode if the model fails to produce JSON
        return res.status(200).json({ sender: 'ai', text: "I'm having a little trouble structuring that. Could you please rephrase?" });
    }

    // The response is now guaranteed to be JSON
    const aiResponseObject = await groqResponse.json();
    aiResponseObject.sender = 'ai';
    
    return res.status(200).json(aiResponseObject);

  } catch (error) {
    console.error("Error with Groq API:", error);
    return res.status(500).json({ error: 'Failed to process request with AI.' });
  }
}