import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Alert, AlertDescription } from "./ui/alert";
import { Trash2, Edit2, CheckCircle2, Circle } from "lucide-react";
import { ensureTokenValid } from "../AuthContext";

const RoutineManager = ({ keycloak, onBack }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newTaskName, setNewTaskName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);
      setError(null);
      await ensureTokenValid();
      const response = await fetch("/api/tasks", {
        headers: {
          Authorization: `Bearer ${keycloak.token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch tasks");
      }

      const data = await response.json();
      setTasks(data.tasks);
    } catch (err) {
      console.error("Error fetching tasks:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async () => {
    if (!newTaskName.trim()) return;

    try {
      await ensureTokenValid();
      const response = await fetch("/api/tasks", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${keycloak.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: newTaskName }),
      });

      if (!response.ok) {
        throw new Error("Failed to create task");
      }

      const data = await response.json();
      setTasks([...tasks, data.task]);
      setNewTaskName("");
    } catch (err) {
      console.error("Error creating task:", err);
      setError(err.message);
    }
  };

  const handleUpdateTask = async (taskId, updates) => {
    try {
      await ensureTokenValid();
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${keycloak.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error("Failed to update task");
      }

      const data = await response.json();
      setTasks(tasks.map((t) => (t.id === taskId ? data.task : t)));
      setEditingId(null);
      setEditingName("");
    } catch (err) {
      console.error("Error updating task:", err);
      setError(err.message);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!confirm("Are you sure you want to delete this task?")) return;

    try {
      await ensureTokenValid();
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${keycloak.token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to delete task");
      }

      setTasks(tasks.filter((t) => t.id !== taskId));
    } catch (err) {
      console.error("Error deleting task:", err);
      setError(err.message);
    }
  };

  const handleToggleEnabled = async (task) => {
    await handleUpdateTask(task.id, { enabled: !task.enabled });
  };

  const startEditing = (task) => {
    setEditingId(task.id);
    setEditingName(task.name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName("");
  };

  const saveEditing = () => {
    if (editingName.trim()) {
      handleUpdateTask(editingId, { name: editingName });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Routine Manager
            </h1>
            <p className="text-gray-600">Create and manage your daily tasks</p>
          </div>
          <Button onClick={onBack} variant="outline">
            Back to Dashboard
          </Button>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Add New Task */}
        <Card className="mb-6 bg-white/80 backdrop-blur">
          <CardHeader>
            <CardTitle>Add New Task</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Enter task name (e.g., Morning meditation, Exercise)..."
                value={newTaskName}
                onChange={(e) => setNewTaskName(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleAddTask()}
              />
              <Button
                onClick={handleAddTask}
                disabled={!newTaskName.trim()}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                Add Task
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tasks List */}
        <Card className="bg-white/80 backdrop-blur">
          <CardHeader>
            <CardTitle>Your Tasks ({tasks.length})</CardTitle>
            <CardDescription>Manage your daily routine tasks</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-600">
                Loading tasks...
              </div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-8 text-gray-600">
                <p>No tasks yet. Create your first task above!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`flex items-center gap-3 p-4 rounded-lg border transition-all ${
                      task.enabled
                        ? "border-gray-200 hover:border-indigo-300 bg-white"
                        : "border-gray-200 bg-gray-50 opacity-60"
                    }`}
                  >
                    <button
                      onClick={() => handleToggleEnabled(task)}
                      className={`flex-shrink-0 ${
                        task.enabled ? "text-green-500" : "text-gray-300"
                      }`}
                    >
                      {task.enabled ? (
                        <CheckCircle2 className="w-6 h-6" />
                      ) : (
                        <Circle className="w-6 h-6" />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      {editingId === task.id ? (
                        <div className="flex gap-2">
                          <Input
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            autoFocus
                            className="flex-1"
                          />
                          <Button
                            size="sm"
                            onClick={saveEditing}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={cancelEditing}
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <p
                          className={`text-lg ${
                            task.enabled
                              ? "text-gray-900"
                              : "text-gray-500 line-through"
                          }`}
                        >
                          {task.name}
                        </p>
                      )}
                    </div>

                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => startEditing(task)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title="Edit task"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                        title="Delete task"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RoutineManager;
