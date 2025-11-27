import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "./firebaseConfig";

export function listenToTasks(courseId, callback) {
  const q = query(collection(db, "courses", courseId, "tasks"));

  return onSnapshot(q, (snapshot) => {
    const tasks = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    callback(tasks);   // real-time updates
  });
}
