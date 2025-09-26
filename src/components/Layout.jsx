import React from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase/config';
import ChatInterface from './ChatInterface';
import TaskView from './TaskView'; // 1. Import TaskView

const Layout = () => {
  const handleLogout = async () => {
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
        <ChatInterface />
        <hr style={{ margin: '30px 0' }} />
        <TaskView /> {/* 2. Add the TaskView component here */}
      </main>
    </div>
  );
};

export default Layout;