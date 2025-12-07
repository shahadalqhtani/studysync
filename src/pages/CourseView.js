import React, { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { auth, db } from "../firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore";

const CourseView = () => {
  const { courseId } = useParams();

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [course, setCourse] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [usersMap, setUsersMap] = useState({});

  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");

  const [sortBy, setSortBy] = useState("dueSoon");

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newDueDate, setNewDueDate] = useState("");
  const [newPriority, setNewPriority] = useState("Low");
  const [newAssignedTo, setNewAssignedTo] = useState("unassigned");

  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [editPriority, setEditPriority] = useState("Low");
  const [editAssignedTo, setEditAssignedTo] = useState("unassigned");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!courseId) return;

    const ref = doc(db, "courses", courseId);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setCourse({ id: snap.id, ...snap.data() });
      } else {
        setCourse(null);
      }
    });

    return () => unsub();
  }, [courseId]);

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
    if (!courseId) return;

    const tasksRef = collection(db, "courses", courseId, "tasks");
    const q = query(tasksRef, orderBy("createdAt", "desc"));

    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));
      setTasks(list);
    });

    return () => unsub();
  }, [courseId]);

  const visibleTasks = useMemo(() => {
    return tasks
      .filter((task) => {
        if (statusFilter === "pending" && task.status !== "Pending") return false;
        if (statusFilter === "completed" && task.status !== "Completed") return false;

        if (priorityFilter !== "all" && task.priority !== priorityFilter)
          return false;

        if (assigneeFilter === "me" && user && task.assignedTo !== user.uid)
          return false;
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

  }, [tasks, statusFilter, priorityFilter, assigneeFilter, user, sortBy]);

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      alert("Title is required.");
      return;
    }

    try {
      const tasksRef = collection(db, "courses", courseId, "tasks");

      const dueDateValue = newDueDate ? new Date(newDueDate) : null;
      const assignedValue =
        newAssignedTo === "unassigned" ? null : newAssignedTo;

      await addDoc(tasksRef, {
        title: newTitle.trim(),
        description: newDescription.trim() || "",
        status: "Pending",
        priority: newPriority,
        dueDate: dueDateValue,
        assignedTo: assignedValue,
        createdAt: new Date(),
      });

      setNewTitle("");
      setNewDescription("");
      setNewDueDate("");
      setNewPriority("Low");
      setNewAssignedTo("unassigned");
    } catch (err) {
      console.error("Error creating task:", err);
      alert("Failed to create task.");
    }
  };

  const startEditing = (task) => {
    setEditingTaskId(task.id);
    setEditTitle(task.title || "");
    setEditDescription(task.description || "");

    const dueDateString = task.dueDate
      ? (task.dueDate.toDate ? task.dueDate.toDate() : new Date(task.dueDate))
          .toISOString()
          .slice(0, 10)
      : "";
    setEditDueDate(dueDateString);
    setEditPriority(task.priority || "Low");
    setEditAssignedTo(task.assignedTo || "unassigned");
  };

  const cancelEditing = () => {
    setEditingTaskId(null);
    setEditTitle("");
    setEditDescription("");
    setEditDueDate("");
    setEditPriority("Low");
    setEditAssignedTo("unassigned");
  };

  const saveEdit = async () => {
    if (!editingTaskId) return;
    if (!editTitle.trim()) {
      alert("Title is required.");
      return;
    }

    try {
      const ref = doc(
        db,
        "courses",
        courseId,
        "tasks",
        editingTaskId
      );

      const dueDateValue = editDueDate ? new Date(editDueDate) : null;
      const assignedValue =
        editAssignedTo === "unassigned" ? null : editAssignedTo;

      await updateDoc(ref, {
        title: editTitle.trim(),
        description: editDescription.trim(),
        dueDate: dueDateValue,
        priority: editPriority,
        assignedTo: assignedValue,
      });

      cancelEditing();
    } catch (err) {
      console.error("Error updating task:", err);
      alert("Failed to update task.");
    }
  };

  const toggleStatus = async (task) => {
    const ref = doc(db, "courses", courseId, "tasks", task.id);
    const newStatus = task.status === "Completed" ? "Pending" : "Completed";
    try {
      await updateDoc(ref, { status: newStatus });
    } catch (err) {
      console.error("Error toggling status:", err);
      alert("Failed to update task status.");
    }
  };

  const deleteTask = async (task) => {
    if (!window.confirm("Delete this task?")) return;
    const ref = doc(db, "courses", courseId, "tasks", task.id);
    try {
      await deleteDoc(ref);
    } catch (err) {
      console.error("Error deleting task:", err);
      alert("Failed to delete task.");
    }
  };

  if (authLoading) {
    return <div style={{ padding: "20px" }}>Loading...</div>;
  }

  if (!user) {
    return (
      <div style={{ padding: "20px", maxWidth: "400px", margin: "0 auto" }}>
        <h2>Course Tasks</h2>
        <p>
          You must be logged in to view this course.{" "}
          <Link to="/login">Go to Login</Link>
        </p>
      </div>
    );
  }

  if (!course) {
    return (
      <div style={{ padding: "20px", maxWidth: "400px", margin: "0 auto" }}>
        <h2>Course Tasks</h2>
        <p>Course not found.</p>
        <p>
          <Link to="/dashboard">Back to Dashboard</Link>
        </p>
      </div>
    );
  }

  const memberOptions = (course.members || []).map((uid) => ({
    uid,
    email: usersMap[uid]?.email || uid,
  }));

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto" }}>
      <h2>{course.title} – Tasks</h2>

      <p>
        <Link to="/dashboard">Back to Dashboard</Link>
      </p>

      {/* New Task Form */}
      <div
        style={{
          border: "1px solid #ddd",
          padding: "10px",
          marginBottom: "15px",
        }}
      >
        <h3 style={{ marginTop: 0 }}>Add Task</h3>
        <form onSubmit={handleCreateTask}>
          <div style={{ marginBottom: "8px" }}>
            <label>
              Title (required)
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                style={{ width: "100%", display: "block", marginTop: "4px" }}
                required
              />
            </label>
          </div>

          <div style={{ marginBottom: "8px" }}>
            <label>
              Description
              <textarea
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                style={{ width: "100%", display: "block", marginTop: "4px" }}
              />
            </label>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <div>
              <label>
                Due Date
                <input
                  type="date"
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  style={{ display: "block", marginTop: "4px" }}
                />
              </label>
            </div>

            <div>
              <label>
                Priority
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                  style={{ display: "block", marginTop: "4px" }}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </label>
            </div>

            <div>
              <label>
                Assigned To
                <select
                  value={newAssignedTo}
                  onChange={(e) => setNewAssignedTo(e.target.value)}
                  style={{ display: "block", marginTop: "4px" }}
                >
                  <option value="unassigned">Unassigned</option>
                  {memberOptions.map((m) => (
                    <option key={m.uid} value={m.uid}>
                      {m.email}
                      {m.uid === user.uid ? " (Me)" : ""}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <button type="submit" style={{ marginTop: "10px" }}>
            Add Task
          </button>
        </form>
      </div>

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

            const isEditing = editingTaskId === task.id;

            return (
              <div
                key={task.id}
                style={{
                  border: "1px solid #ddd",
                  padding: "10px",
                  marginBottom: "10px",
                }}
              >
                {/* Header row: title + status toggle */}
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div>
                    {!isEditing ? (
                      <strong>{task.title}</strong>
                    ) : (
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        style={{ width: "100%" }}
                      />
                    )}
                    <div style={{ fontSize: "14px", color: "#555" }}>
                      Status: {task.status}
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

                {/* Description */}
                <div style={{ marginTop: "8px" }}>
                  {!isEditing ? (
                    task.description && <p>{task.description}</p>
                  ) : (
                    <textarea
                      value={editDescription}
                      onChange={(e) => setEditDescription(e.target.value)}
                      style={{ width: "100%" }}
                    />
                  )}
                </div>

                {/* Details row */}
                <div style={{ fontSize: "14px", marginTop: "8px" }}>
                  <div>
                    Priority:{" "}
                    {!isEditing ? (
                      task.priority
                    ) : (
                      <select
                        value={editPriority}
                        onChange={(e) => setEditPriority(e.target.value)}
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                      </select>
                    )}
                  </div>
                  <div>
                    Due date:{" "}
                    {!isEditing ? (
                      dueDateString || "None"
                    ) : (
                      <input
                        type="date"
                        value={editDueDate}
                        onChange={(e) => setEditDueDate(e.target.value)}
                      />
                    )}
                  </div>
                  <div>
                    Assigned to:{" "}
                    {!isEditing ? (
                      assignee
                    ) : (
                      <select
                        value={editAssignedTo}
                        onChange={(e) =>
                          setEditAssignedTo(e.target.value)
                        }
                      >
                        <option value="unassigned">Unassigned</option>
                        {memberOptions.map((m) => (
                          <option key={m.uid} value={m.uid}>
                            {m.email}
                            {m.uid === user.uid ? " (Me)" : ""}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div style={{ marginTop: "8px" }}>
                  {!isEditing ? (
                    <>
                      <button onClick={() => startEditing(task)}>Edit</button>
                      <button
                        onClick={() => deleteTask(task)}
                        style={{ marginLeft: "8px" }}
                      >
                        Delete
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={saveEdit}>Save</button>
                      <button
                        onClick={cancelEditing}
                        style={{ marginLeft: "8px" }}
                      >
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CourseView;
