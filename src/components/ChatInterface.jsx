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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleCreateTask = async (taskData) => {
    setIsLoading(true); // Show loading while saving
    try {
      await addTask(taskData);
      const confirmationMessage = { sender: 'ai', text: `Great! I've added "${taskData.title}" to your tasks.` };
      setMessages(prev => {
        // Remove the old confirmation question and add the final success message
        const filteredMessages = prev.filter(msg => msg.type !== 'confirmation');
        return [...filteredMessages, confirmationMessage];
      });
    } catch (error) {
        const errorMessage = { sender: 'ai', text: 'I had trouble saving that task. Please try again.' };
        setMessages(prev => [...prev, errorMessage]);
    } finally {
      setPendingTask(null); // Clear the pending task
      setIsLoading(false); // Stop loading after saving
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!userInput.trim() || isLoading) return;

    const newUserMessage = { sender: 'user', text: userInput };
    
    setMessages(prev => [...prev, newUserMessage]);
    setUserInput('');
    setIsLoading(true);

    // --- LOGIC CORRECTION ---

    // 1. Check if we are waiting for a confirmation from the user
    if (pendingTask) {
      const positiveResponses = ['yes', 'confirm', 'yep', 'ok', 'sounds good', 'correct'];
      if (positiveResponses.includes(userInput.toLowerCase().trim())) {
        await handleCreateTask(pendingTask); // Await the creation
      } else {
        setMessages(prev => [...prev, { sender: 'ai', text: "Okay, I've cancelled that task." }]);
        setPendingTask(null);
        setIsLoading(false);
      }
      return; // Stop here after handling the confirmation
    }

    // 2. If not confirming, proceed with the normal API call
    try {
      const response = await fetch('/api/processTask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, newUserMessage] }), // Send the most up-to-date messages
      });

      if (!response.ok) throw new Error('Network response was not ok');

      const aiResponse = await response.json();
      
      // 3. If the AI is asking for confirmation, set the pending task and STOP loading
      if (aiResponse.type === 'confirmation' && aiResponse.taskData) {
        setPendingTask(aiResponse.taskData);
        setIsLoading(false); // **THE FIX**: Stop loading to wait for user input
      } else {
         setIsLoading(false); // Stop loading after a normal question
      }
      
      setMessages(prev => [...prev, aiResponse]);

    } catch (error) {
      console.error("Error calling API endpoint:", error);
      const errorMessage = { sender: 'ai', text: 'Sorry, I ran into an error. Please try again.' };
      setMessages(prev => [...prev, errorMessage]);
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
          placeholder="e.g., Schedule a team meeting for tomorrow at 2pm"
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>Send</button>
      </form>
    </div>
  );
};

export default ChatInterface;