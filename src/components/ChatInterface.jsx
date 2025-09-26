import React, { useState, useRef, useEffect } from 'react';
import { addTask } from '../firebase/firestoreService';

const ChatInterface = () => {
  const [userInput, setUserInput] = useState('');
  const [messages, setMessages] = useState([
    { sender: 'ai', text: 'Hello! How can I help you schedule your day?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // Function to automatically scroll to the latest message
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    const newUserMessage = { sender: 'user', text: userInput };
    setMessages(prev => [...prev, newUserMessage]);
    setUserInput('');
    setIsLoading(true);

    try {
      // --- THIS IS THE UPDATED SECTION ---
      // We now use a standard fetch call to our Vercel API endpoint.
      const response = await fetch('/api/processTask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: userInput }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      const aiResponse = await response.json();
      setMessages(prev => [...prev, aiResponse]);
      // --- END OF UPDATED SECTION ---

    } catch (error) {
      console.error("Error calling API endpoint:", error);
      const errorMessage = { sender: 'ai', text: 'Sorry, I ran into an error. Please try again.' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleCreateTask = async (taskData) => {
    try {
      await addTask(taskData);
      const confirmationMessage = { sender: 'ai', text: `Great! I've added "${taskData.title}" to your tasks.` };
      setMessages(prev => [...prev, confirmationMessage]);
    } catch (error) {
        const errorMessage = { sender: 'ai', text: 'I had trouble saving that task. Please check your connection and try again.' };
        setMessages(prev => [...prev, errorMessage]);
    }
  };

  return (
    <div className="chat-interface-container">
      <div className="messages-list">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.sender}`}>
            <p>{msg.text}</p>
            {msg.type === 'confirmation' && msg.taskData && (
              <button 
                className="create-task-button"
                onClick={() => handleCreateTask(msg.taskData)}
              >
                Create Task
              </button>
            )}
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
          placeholder="e.g., Schedule a team meeting for 3 hours tomorrow at 2pm"
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>Send</button>
      </form>
    </div>
  );
};

export default ChatInterface;