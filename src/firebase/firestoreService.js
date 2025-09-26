import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from './config';

// Function to add a new task to Firestore
export const addTask = async (taskData) => {
  if (!auth.currentUser) {
    throw new Error("User not authenticated");
  }

  try {
    const tasksCollectionRef = collection(db, 'tasks');
    await addDoc(tasksCollectionRef, {
      ...taskData,
      userId: auth.currentUser.uid, // Tag the task with the user's ID
      completed: false,
      createdAt: serverTimestamp(),
    });
    console.log("Task successfully added to Firestore");
  } catch (error) {
    console.error("Error adding document: ", error);
    throw new Error("Could not save the task.");
  }
};