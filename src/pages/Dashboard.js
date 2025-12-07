import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { auth, db } from "../firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  collectionGroup,
  onSnapshot,
  query,
  where,
  doc,
  updateDoc,
  orderBy,
} from "firebase/firestore";

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [courses, setCourses] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [usersMap, setUsersMap] = useState({});

  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");

  const [sortBy, setSortBy] = useState("dueSoon"); 

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snapshot) => {
      const map = {};
      snapshot.forEach((docSnap) => {
        map[docSnap.id] = docSnap.data();
      });
      setUsersMap(map);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, "courses"),
      where("members", "array-contains", user.uid)
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setCourses(list);
    });

    return () => unsub();
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const q = query(collectionGroup(db, "tasks"));

    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((docSnap) => {
        const data = docSnap.data();
        const courseRef = docSnap.ref.parent.parent;
        const courseId = courseRef ? courseRef.id : null;

        return {
          id: docSnap.id,
          courseId,
          ...data,
        };
      });

      setTasks(list);
    });

    return () => unsub();
  }, [user]);

  const visibleTasks = useMemo(() => {
    if (!user) return [];

    return tasks
      .filter((task) => {
        if (!task.courseId) return false;
        const course = courses.find((c) => c.id === task.courseId);
        if (!course) return false;
        return course.members?.includes(user.uid);
      })
      .filter((task) => {
        if (statusFilter === "pending" && task.status !== "Pending") return false;
        if (statusFilter === "completed" && task.status !== "Completed") return false;

        if (priorityFilter !== "all" && task.priority !== priorityFilter) return false;

        if (assigneeFilter === "me" && task.assignedTo !== user.uid) return false;
        if (assigneeFilter === "unassigned" && task.assignedTo) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === "none") return 0;

        const hasA = !!a.dueDate;
        const hasB = !!b.dueDate;

        if (!hasA && !hasB) return 0;
        if (!hasA) return 1;
        if (!hasB) return -1;

        const da = a.dueDate.toDate ? a.dueDate.toDate() : new Date(a.dueDate);
        const db = b.dueDate.toDate ? b.dueDate.toDate() : new Date(b.dueDate);

        if (sortBy === "dueSoon") {
          return da - db;
        } else if (sortBy === "dueLate") {
          return db - da;
        }

        return 0;
      });
  }, [tasks, courses, user, statusFilter, priorityFilter, assigneeFilter, sortBy]);

  const toggleStatus = async (task) => {
    if (!task.courseId) return;
    const ref = doc(db, "courses", task.courseId, "tasks", task.id);
    const newStatus = task.status === "Completed" ? "Pending" : "Completed";
    try {
      await updateDoc(ref, { status: newStatus });
    } catch (err) {
      console.error("Error toggling status:", err);
      alert("Failed to update task status.");
    }
  };

  const changePriority = async (task, newPriority) => {
    if (!task.courseId) return;
    const ref = doc(db, "courses", task.courseId, "tasks", task.id);
    try {
      await updateDoc(ref, { priority: newPriority });
    } catch (err) {
      console.error("Error updating priority:", err);
      alert("Failed to update task priority.");
    }
  };

  const changeDueDate = async (task, newDateString) => {
    if (!task.courseId) return;
    const ref = doc(db, "courses", task.courseId, "tasks", task.id);
    let value = null;
    if (newDateString) {
      value = new Date(newDateString);
    }
    try {
      await updateDoc(ref, { dueDate: value });
    } catch (err) {
      console.error("Error updating due date:", err);
      alert("Failed to update task due date.");
    }
  };

  if (authLoading) {
    return <div style={{ padding: "20px" }}>Loading...</div>;
  }

  if (!user) {
    return (
      <div style={{ padding: "20px", maxWidth: "400px", margin: "0 auto" }}>
        <h2>Dashboard</h2>
        <p>
          You must be logged in to view your tasks.{" "}
          <Link to="/login">Go to Login</Link>
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto" }}>
      <h2>Dashboard</h2>

      {/* Filters */}
      <div
        style={{
          border: "1px solid #ddd",
          padding: "10px",
          marginBottom: "15px",
        }}
      >
        <h3 style={{ marginTop: 0 }}>Filters</h3>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {/* Status */}
          <div>
            <label>Status: </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Priority */}
          <div>
            <label>Priority: </label>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <option value="all">All</option>
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>

          {/* Assignee */}
          <div>
            <label>Assignee: </label>
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
            >
              <option value="all">All tasks</option>
              <option value="me">Only tasks assigned to me</option>
              <option value="unassigned">Unassigned tasks</option>
            </select>
          </div>

          <div>
            <label>Sort by: </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
            >
              <option value="dueSoon">Due date (soonest first)</option>
              <option value="dueLate">Due date (latest first)</option>
              <option value="none">No sorting</option>
            </select>
          </div>

        </div>
      </div>

      {/* Task list */}
      {visibleTasks.length === 0 ? (
        <p>No tasks found with the current filters.</p>
      ) : (
        <div>
          {visibleTasks.map((task) => {
            const course = courses.find((c) => c.id === task.courseId);
            const courseTitle = course ? course.title : "(Unknown course)";

            const assignee =
              task.assignedTo && usersMap[task.assignedTo]
                ? usersMap[task.assignedTo].email
                : task.assignedTo
                ? `(Unknown user: ${task.assignedTo})`
                : "Unassigned";

            const dueDateString = task.dueDate
              ? (task.dueDate.toDate
                  ? task.dueDate.toDate()
                  : new Date(task.dueDate)
                )
                  .toISOString()
                  .slice(0, 10)
              : "";

            return (
              <div
                key={task.id + task.courseId}
                style={{
                  border: "1px solid #ddd",
                  padding: "10px",
                  marginBottom: "10px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>
                    <strong>{task.title}</strong>
                    <div style={{ fontSize: "14px", color: "#555" }}>
                      Course: {courseTitle}
                    </div>
                  </div>
                  <div>
                    <button onClick={() => toggleStatus(task)}>
                      {task.status === "Completed"
                        ? "Mark Pending"
                        : "Mark Completed"}
                    </button>
                  </div>
                </div>

                {task.description && (
                  <p style={{ marginTop: "8px" }}>{task.description}</p>
                )}

                {/* Info row */}
                <div style={{ fontSize: "14px", marginTop: "8px" }}>
                  <div>Status: {task.status}</div>
                  <div>
                    Priority:{" "}
                    <select
                      value={task.priority || "Low"}
                      onChange={(e) => changePriority(task, e.target.value)}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </div>
                  <div>
                    Due date:{" "}
                    <input
                      type="date"
                      value={dueDateString}
                      onChange={(e) => changeDueDate(task, e.target.value)}
                    />
                  </div>
                  <div>
                    Assigned to: {assignee}
                  </div>

                </div>

                {/* Link to course */}
                {task.courseId && (
                  <div style={{ marginTop: "8px", fontSize: "14px" }}>
                    <Link to={`/course/${task.courseId}`}>
                      View this task in course view
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Dashboard;
