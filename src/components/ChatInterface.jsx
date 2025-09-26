import React, { useState, useRef, useEffect } from 'react';
import { addTask } from '../firebase/firestoreService';

const ChatInterface = () => {
  const [userInput, setUserInput] = useState('');
  const [messages, setMessages] = useState([
    { sender: 'ai', text: 'Hello! How can I help you schedule your day?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    const newUserMessage = { sender: 'user', text: userInput };
    const newMessages = [...messages, newUserMessage];
    
    setMessages(newMessages);
    setUserInput('');
    setIsLoading(true);

    try {
      // --- THIS IS THE UPDATED SECTION ---
      // We pass the entire message history to the API endpoint.
      const response = await fetch('/api/processTask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Send the newMessages array directly
        body: JSON.stringify({ messages: newMessages }),
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
      
      // Clear the confirmation button after creating the task
      setMessages(prev => {
        const updatedMessages = prev.filter(msg => msg.type !== 'confirmation');
        return [...updatedMessages, confirmationMessage];
      });

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
            {/* Display task data for confirmation if it exists */}
            {msg.type === 'confirmation' && msg.taskData ? (
              <div>
                <p>Here are the details for your new task:</p>
                <ul>
                  <li><strong>Title:</strong> {msg.taskData.title}</li>
                  <li><strong>Date:</strong> {msg.taskData.date}</li>
                  <li><strong>Time:</strong> {msg.taskData.time}</li>
                  {msg.taskData.duration && <li><strong>Duration:</strong> {msg.taskData.duration}</li>}
                  {msg.taskData.priority && <li><strong>Priority:</strong> High</li>}
                </ul>
                <button 
                  className="create-task-button"
                  onClick={() => handleCreateTask(msg.taskData)}
                >
                  Create Task
                </button>
              </div>
            ) : (
              <p>{msg.text}</p>
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