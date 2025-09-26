import React, { useState, useRef, useEffect } from 'react';
import { addTask } from '../firebase/firestoreService';

const ChatInterface = () => {
  const [userInput, setUserInput] = useState('');
  const [messages, setMessages] = useState([
    { sender: 'ai', text: 'Hello! How can I help you schedule your day?' }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [pendingTask, setPendingTask] = useState(null); // State for the task awaiting confirmation
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleCreateTask = async (taskData) => {
    try {
      await addTask(taskData);
      const confirmationMessage = { sender: 'ai', text: `Great! I've added "${taskData.title}" to your tasks.` };
      setMessages(prev => [...prev, confirmationMessage]);
    } catch (error) {
        const errorMessage = { sender: 'ai', text: 'I had trouble saving that task. Please check your connection and try again.' };
        setMessages(prev => [...prev, errorMessage]);
    } finally {
      setPendingTask(null); // Clear the pending task
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    const newUserMessage = { sender: 'user', text: userInput };
    const newMessages = [...messages, newUserMessage];
    
    setMessages(newMessages);
    setUserInput('');
    setIsLoading(true);

    // 1. Check if we are waiting for a confirmation
    if (pendingTask) {
      const positiveResponses = ['yes', 'confirm', 'yep', 'ok', 'sounds good', 'correct'];
      if (positiveResponses.includes(userInput.toLowerCase().trim())) {
        await handleCreateTask(pendingTask);
      } else {
        setMessages(prev => [...prev, { sender: 'ai', text: "Okay, I've cancelled that task." }]);
        setPendingTask(null);
        setIsLoading(false);
      }
      return; // Stop here after handling confirmation
    }

    // 2. If not confirming, proceed with the normal API call
    try {
      const response = await fetch('/api/processTask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });

      if (!response.ok) throw new Error('Network response was not ok');

      const aiResponse = await response.json();
      
      // 3. If the AI is asking for confirmation, set the pending task
      if (aiResponse.type === 'confirmation' && aiResponse.taskData) {
        setPendingTask(aiResponse.taskData);
      }
      
      setMessages(prev => [...prev, aiResponse]);

    } catch (error) {
      console.error("Error calling API endpoint:", error);
      const errorMessage = { sender: 'ai', text: 'Sorry, I ran into an error. Please try again.' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      if (!pendingTask) setIsLoading(false);
    }
  };

  return (
    <div className="chat-interface-container">
      <div className="messages-list">
        {messages.map((msg, index) => (
          <div key={index} className={`message ${msg.sender}`}>
            {/* The text now comes from the 'text' property of the JSON response */}
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
          placeholder="e.g., Schedule a team meeting for tomorrow at 2pm"
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>Send</button>
      </form>
    </div>
  );
};

export default ChatInterface;