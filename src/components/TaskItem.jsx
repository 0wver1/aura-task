import React from 'react';

const TaskItem = ({ task }) => {
  // A helper to format the date if it exists
  const formattedDate = task.date 
    ? new Date(task.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) 
    : 'No date';

  return (
    <div className={`task-item ${task.completed ? 'completed' : ''}`}>
      <input
        type="checkbox"
        className="task-item-checkbox"
        checked={task.completed}
        // We'll add the update functionality later
        onChange={() => console.log("Toggle complete for task:", task.id)}
      />
      <div className="task-item-details">
        <h3>{task.title || 'Untitled Task'}</h3>
        <p>
          {formattedDate} at {task.time || 'any time'}
          {task.duration && ` for ${task.duration}`}
        </p>
      </div>
      <div className="task-item-actions">
        {/* We'll add delete functionality later */}
        <button onClick={() => console.log("Delete task:", task.id)}>
          🗑️
        </button>
      </div>
    </div>
  );
};

export default TaskItem;