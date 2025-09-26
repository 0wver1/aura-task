import React from 'react';
import { useAuth } from './hooks/useAuth';
import Auth from './components/Auth';
import Layout from './components/Layout'; // Import Layout
import './App.css';

function App() {
  const { currentUser } = useAuth();

  return (
    <div className="App">
      {currentUser ? (
        // If user is logged in, show the Layout component
        <Layout />
      ) : (
        // If user is not logged in, show the Auth component
        <Auth />
      )}
    </div>
  );
}

export default App;