import React, { useState, useRef, useEffect } from 'react';
import { addTask } from '../firebase/firestoreService';

const ChatInterface = () => {
  const [userInput, setUserInput] = useState('');
  const [messages, setMessages] = useState([
    { sender: 'ai', text: 'Hello! How can I help you schedule your day?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingTask, setPendingTask] = useState(null);
  const messagesEndRef = useRef(null);

  // Effect to auto-scroll to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Function to create the task in Firestore
  const handleCreateTask = async (taskData) => {
    setIsLoading(true);
    try {
      await addTask(taskData);
      const successMessage = { sender: 'ai', text: `Great! I've added "${taskData.title}" to your tasks.` };
      
      // Update the chat, removing the old confirmation and adding the success message
      setMessages(prev => [...prev.filter(m => m.type !== 'confirmation'), successMessage]);

    } catch (error) {
      console.error("Error adding task:", error);
      setMessages(prev => [...prev, { sender: 'ai', text: 'I had trouble saving that task. Please try again.' }]);
    } finally {
      setPendingTask(null); // Reset the pending task state
      setIsLoading(false);
    }
  };

  // Main function to handle sending messages
  const handleSendMessage = async (e) => {
    e.preventDefault();
    const currentInput = userInput.trim();
    if (!currentInput || isLoading) return;

    // Add user's message to the chat immediately
    const newUserMessage = { sender: 'user', text: currentInput };
    setMessages(prev => [...prev, newUserMessage]);
    setUserInput('');
    setIsLoading(true);

    // --- REVISED LOGIC ---

    // 1. Check if a task is awaiting confirmation.
    if (pendingTask) {
      const positiveResponses = ['yes', 'confirm', 'yep', 'ok', 'sounds good', 'correct'];
      if (positiveResponses.includes(currentInput.toLowerCase())) {
        // If user confirms, create the task.
        await handleCreateTask(pendingTask);
      } else {
        // If user denies, cancel the task.
        setMessages(prev => [...prev, { sender: 'ai', text: "Okay, I've cancelled that task creation." }]);
        setPendingTask(null);
        setIsLoading(false);
      }
      return; // IMPORTANT: Stop execution here.
    }

    // 2. If no task is pending, send the conversation to the AI.
    try {
      const response = await fetch('/api/processTask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Send the complete message history including the new user message
        body: JSON.stringify({ messages: [...messages, newUserMessage] }),
      });

      if (!response.ok) throw new Error('Network response was not ok');

      const aiResponse = await response.json();
      
      // 3. If the AI responds with a confirmation, set it as pending.
      if (aiResponse.type === 'confirmation' && aiResponse.taskData) {
        setPendingTask(aiResponse.taskData);
      }
      
      setMessages(prev => [...prev, aiResponse]);

    } catch (error) {
      console.error("API Error:", error);
      setMessages(prev => [...prev, { sender: 'ai', text: 'Sorry, I ran into a connection error.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-interface-container">
      <div className="messages-list">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.sender}`}>
            <p>{msg.text}</p>
          </div>
        ))}
        {isLoading && <div className="message ai"><p><i>Typing...</i></p></div>}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSendMessage} className="message-form">
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="e.g., Schedule a meeting for tomorrow at 2pm"
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>Send</button>
      </form>
    </div>
  );
};

export default ChatInterface;