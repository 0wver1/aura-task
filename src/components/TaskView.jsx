import React, { useState, useEffect } from 'react';
import { getTasks } from '../firebase/firestoreService';
import TaskItem from './TaskItem';

const TaskView = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // getTasks sets up a real-time listener.
    // It returns an 'unsubscribe' function to clean up the listener.
    const unsubscribe = getTasks((fetchedTasks) => {
      setTasks(fetchedTasks);
      setLoading(false);
    });

    // This cleanup function is called when the component unmounts
    return () => unsubscribe();
  }, []); // The empty array ensures this runs only once on mount

  if (loading) {
    return <p>Loading tasks...</p>;
  }

  return (
    <div className="task-view-container">
      <h2>Your Tasks</h2>
      {tasks.length > 0 ? (
        tasks.map(task => (
          <TaskItem key={task.id} task={task} />
        ))
      ) : (
        <p>You have no tasks yet. Create one with the chat!</p>
      )}
    </div>
  );
};

export default TaskView;