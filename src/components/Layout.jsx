import React from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import ChatInterface from './ChatInterface'; // Import the new component

const Layout = () => {
  const handleLogout = async () => {
    // ... (logout function remains the same)
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };

  return (
    <div className="layout-container">
      <header className="app-header">
        <h1>Aura Task</h1>
        <button onClick={handleLogout} className="logout-button">
          Logout
        </button>
      </header>
      <main className="app-main-content">
        {/* Replace the placeholder with our component */}
        <ChatInterface />
      </main>
    </div>
  );
};

export default Layout;