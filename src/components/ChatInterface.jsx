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
    console.log("Creating task with data:", taskData); // DEBUG LOG
    setIsLoading(true);
    try {
      await addTask(taskData);
      const successMessage = { sender: 'ai', text: `Great! I've added "${taskData.title}" to your tasks.` };
      setMessages(prev => [...prev.filter(msg => msg.type !== 'confirmation'), successMessage]);
    } catch (error) {
        setMessages(prev => [...prev, { sender: 'ai', text: 'I had trouble saving that task. Please try again.' }]);
    } finally {
      setPendingTask(null);
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const currentInput = userInput.trim();
    if (!currentInput || isLoading) return;

    const newUserMessage = { sender: 'user', text: currentInput };
    setMessages(prev => [...prev, newUserMessage]);
    setUserInput('');
    setIsLoading(true);

    // --- MAIN LOGIC BLOCK ---

    // 1. If a task is waiting for confirmation, handle it here.
    if (pendingTask) {
      console.log("User is confirming a pending task:", pendingTask); // DEBUG LOG
      const positiveResponses = ['yes', 'confirm', 'yep', 'ok', 'sounds good', 'correct'];
      
      if (positiveResponses.includes(currentInput.toLowerCase())) {
        await handleCreateTask(pendingTask);
      } else {
        setMessages(prev => [...prev, { sender: 'ai', text: "Okay, I've cancelled that task." }]);
        setPendingTask(null);
        setIsLoading(false);
      }
      // CRUCIAL: Stop execution here. Do not proceed to the API call.
      return; 
    }

    // 2. If no task is pending, contact the AI.
    try {
      const response = await fetch('/api/processTask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: [...messages, newUserMessage] }),
      });

      if (!response.ok) throw new Error('Network response was not ok');

      const aiResponse = await response.json();
      setMessages(prev => [...prev, aiResponse]);
      
      // 3. If the AI's response is a confirmation, set the pending task.
      if (aiResponse.type === 'confirmation' && aiResponse.taskData) {
        console.log("Confirmation received, setting pending task:", aiResponse.taskData); // DEBUG LOG
        setPendingTask(aiResponse.taskData);
      }

    } catch (error) {
      console.error("API Error:", error);
      setMessages(prev => [...prev, { sender: 'ai', text: 'Sorry, I ran into an error. Please try again.' }]);
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
          placeholder="e.g., Schedule a team meeting for tomorrow at 2pm"
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading}>Send</button>
      </form>
    </div>
  );
};

export default ChatInterface;