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
      You are an expert task information extractor for an app called "Aura Task".
      Your goal is to collect all the necessary details for creating a task from the user's conversational input.

      The "Task Essentials" are:
      1.  **title**: The specific action to be done.
      2.  **date**: The date for the task.
      3.  **time**: The time for the task.

      Your process is as follows:
      1.  Analyze the user's latest message based on the entire conversation history.
      2.  If you have all three "Task Essentials", respond with a JSON object with "type": "confirmation". The 'taskData' field should contain all extracted details.
          The 'text' field in your response MUST be a clear question summarizing the task and asking for confirmation. For example: "Okay, I have: 'Study math' for 2 hours today at 10am. Does that look correct?"
      3.  If any "Task Essential" is missing, ask a SINGLE, direct, and friendly question to get the missing information. Your response must be simple text, NOT JSON.
      4.  Never create a task without a title, date, and time.

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
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!groqResponse.ok) {
      const errorBody = await groqResponse.text();
      throw new Error(`Groq API error: ${groqResponse.statusText} - ${errorBody}`);
    }

    const result = await groqResponse.json();
    let aiText = result.choices[0]?.message?.content;

    aiText = aiText.replace(/```json/g, "").replace(/```/g, "").trim();

    let aiResponseObject;
    try {
      aiResponseObject = JSON.parse(aiText);
    } catch {
      aiResponseObject = { text: aiText };
    }

    aiResponseObject.sender = 'ai';
    return res.status(200).json(aiResponseObject);

  } catch (error) {
    console.error("Error with Groq API:", error);
    return res.status(500).json({ error: 'Failed to process request with AI.' });
  }
}