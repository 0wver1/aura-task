export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // Expect 'messages' array from the frontend
    const { messages } = req.body;
    if (!messages || messages.length === 0) {
      return res.status(400).json({ error: 'Message history is required.' });
    }

    // The most recent user message
    const userInput = messages[messages.length - 1].content;

    const systemPrompt = `
      You are an expert task information extractor for an app called "Aura Task".
      Your goal is to collect all the necessary details for creating a task from the user's conversational input.

      The "Task Essentials" are:
      1.  **title**: The specific action to be done (e.g., "Draft the project proposal").
      2.  **date**: The date for the task (e.g., "tomorrow", "2024-10-28").
      3.  **time**: The time for the task (e.g., "morning", "2pm", "14:00").

      Optional details include:
      - **duration**: How long the task will take (e.g., "3 hours", "1 hr").
      - **priority**: High priority can be inferred from keywords like "ASAP", "urgent", "important".
      - **notes**: Any additional description.

      Your process is as follows:
      1.  Analyze the user's latest message based on the entire conversation history.
      2.  If you have all three "Task Essentials" (title, date, time), respond with a JSON object with "type": "confirmation". The 'taskData' field should contain all extracted details. Do not ask for notes, just assume the user will provide them if they want to.
      3.  If any "Task Essential" is missing, ask a SINGLE, direct, and friendly question to get the missing information. Your response must be a simple string, NOT JSON. For example: "Sounds good. When would you like to schedule that for?" or "Got it. What time should that be?"
      4.  Never create a task without a title, date, and time.

      Today's date is ${new Date().toLocaleDateString('en-CA')}.
    `;

    // Map your message history to the format expected by the Groq API
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
          // Pass the mapped conversation history
          ...groqMessages
        ],
        model: "llama-3.1-8b-instant",
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

    // Clean and attempt to parse JSON
    aiText = aiText.replace(/```json/g, "").replace(/```/g, "").trim();

    let aiResponseObject;
    try {
      // If parsing succeeds, it's a confirmation
      aiResponseObject = JSON.parse(aiText);
    } catch {
      // If it fails, it's a clarifying question (simple text)
      aiResponseObject = { text: aiText };
    }

    aiResponseObject.sender = 'ai';
    return res.status(200).json(aiResponseObject);

  } catch (error) {
    console.error("Error with Groq API:", error);
    return res.status(500).json({ error: 'Failed to process request with AI.' });
  }
}