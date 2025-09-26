import { collection, addDoc, serverTimestamp, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db, auth } from './config';

// Function to add a new task to Firestore
export const addTask = async (taskData) => {
  // ... (this function remains the same)
  if (!auth.currentUser) {
    throw new Error("User not authenticated");
  }
  try {
    const tasksCollectionRef = collection(db, 'tasks');
    await addDoc(tasksCollectionRef, {
      ...taskData,
      userId: auth.currentUser.uid,
      completed: false,
      createdAt: serverTimestamp(),
    });
    console.log("Task successfully added to Firestore");
  } catch (error) {
    console.error("Error adding document: ", error);
    throw new Error("Could not save the task.");
  }
};

// ✅ NEW FUNCTION TO GET TASKS
// This function sets up a real-time listener for tasks
export const getTasks = (callback) => {
  if (!auth.currentUser) {
    return () => {}; // Return an empty unsubscribe function if no user
  }

  const tasksCollectionRef = collection(db, 'tasks');
  
  // Create a query to get only the tasks for the current user, ordered by creation time
  const q = query(
    tasksCollectionRef, 
    where("userId", "==", auth.currentUser.uid),
    orderBy("createdAt", "desc")
  );

  // onSnapshot creates a real-time listener
  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const tasks = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(tasks); // Send the tasks back to the component
  });

  return unsubscribe; // Return the function to stop the listener
};