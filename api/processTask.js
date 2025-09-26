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
      You are a task information extractor. You have two possible response types: asking a question or confirming a task.

      1.  **If you have all the necessary information** (title, date, and time), you MUST respond ONLY with a JSON object. Your entire response must be a single JSON code block and nothing else.
          The structure MUST be:
          \`\`\`json
          {
            "type": "confirmation",
            "taskData": {
              "title": "...",
              "date": "YYYY-MM-DD",
              "time": "...",
              "duration": "..."
            },
            "text": "A friendly question summarizing the details. e.g., 'Got it. Just to confirm: Study math on 2025-09-27 at 10:00 AM for 2 hours. Is that correct?'"
          }
          \`\`\`

      2.  **If any information is missing**, you MUST respond ONLY with a short, simple question as a plain text string. Do not use JSON. For example: "What time would you like to schedule that?"

      Today's date is ${new Date().toLocaleDateString('en-CA')}. Analyze the conversation and provide one of these two response types.
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
      }),
    });

    if (!groqResponse.ok) {
      const errorBody = await groqResponse.text();
      throw new Error(`Groq API error: ${groqResponse.statusText} - ${errorBody}`);
    }

    const result = await groqResponse.json();
    let aiText = result.choices[0]?.message?.content;

    // Clean the response to extract the JSON if it exists
    const jsonMatch = aiText.match(/```json([\s\S]*?)```/);
    
    let aiResponseObject;
    if (jsonMatch && jsonMatch[1]) {
      // If we found a JSON block, parse it
      try {
        aiResponseObject = JSON.parse(jsonMatch[1]);
      } catch {
        // Fallback for malformed JSON
        aiResponseObject = { sender: 'ai', text: "I seem to have made a formatting error. Could you try again?" };
      }
    } else {
      // Otherwise, treat it as a plain text question
      aiResponseObject = { text: aiText };
    }

    aiResponseObject.sender = 'ai';
    return res.status(200).json(aiResponseObject);

  } catch (error) {
    console.error("Error with Groq API:", error);
    return res.status(500).json({ error: 'Failed to process request with AI.' });
  }
}