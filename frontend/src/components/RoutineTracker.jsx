import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import { CheckCircle2, Circle } from "lucide-react";

const RoutineTracker = ({ token, onNavigateToDashboard, onNavigateToManager }) => {
  const [tasks, setTasks] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [today] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    fetchTasksAndCompletions();
  }, []);

  const fetchTasksAndCompletions = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch all tasks
      const tasksResponse = await fetch("/api/tasks", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!tasksResponse.ok) {
        throw new Error("Failed to fetch tasks");
      }

      const tasksData = await tasksResponse.json();
      const enabledTasks = tasksData.tasks.filter((t) => t.enabled);
      setTasks(enabledTasks);

      // Fetch completions for today
      const completionsResponse = await fetch(`/api/tasks/completions/${today}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!completionsResponse.ok) {
        throw new Error("Failed to fetch completions");
      }

      const completionsData = await completionsResponse.json();
      setCompletions(completionsData.completions);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isTaskCompleted = (taskId) => {
    return completions.some((c) => c.task_id === taskId);
  };

  const handleToggleCompletion = async (taskId) => {
    const isCompleted = isTaskCompleted(taskId);

    try {
      if (isCompleted) {
        // Remove completion
        const response = await fetch(`/api/tasks/completions/${taskId}/${today}`, {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Failed to remove completion");
        }

        setCompletions(completions.filter((c) => c.task_id !== taskId));
      } else {
        // Add completion
        const response = await fetch("/api/tasks/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ taskId, completionDate: today }),
        });

        if (!response.ok) {
          throw new Error("Failed to mark task as completed");
        }

        setCompletions([...completions, { task_id: taskId, completion_date: today }]);
      }
    } catch (err) {
      console.error("Error toggling completion:", err);
      setError(err.message);
    }
  };

  const completionCount = completions.length;
  const totalCount = tasks.length;
  const completionPercentage =
    totalCount > 0 ? Math.round((completionCount / totalCount) * 100) : 0;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Daily Routine</h1>
            <p className="text-gray-600">{formatDate(today)}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={onNavigateToManager} variant="outline">
              Manage Tasks
            </Button>
            <Button
              onClick={onNavigateToDashboard}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              Back to Dashboard
            </Button>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Progress Card */}
        <Card className="mb-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-lg">
          <CardContent className="pt-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-indigo-100 text-sm font-medium">Completed Today</p>
                <p className="text-5xl font-bold mt-2">
                  {completionCount}/{totalCount}
                </p>
              </div>
              <div>
                <p className="text-indigo-100 text-sm font-medium">Progress</p>
                <div className="mt-2 flex items-baseline gap-2">
                  <p className="text-5xl font-bold">{completionPercentage}%</p>
                </div>
              </div>
            </div>
            <div className="mt-4 w-full bg-indigo-400 rounded-full h-3">
              <div
                className="bg-white h-3 rounded-full transition-all duration-300"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Tasks List */}
        <Card className="bg-white/80 backdrop-blur">
          <CardHeader>
            <CardTitle>Today's Tasks</CardTitle>
            <CardDescription>Check off each task as you complete it</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-600">Loading tasks...</div>
            ) : tasks.length === 0 ? (
              <div className="text-center py-12 text-gray-600">
                <p className="mb-4">No tasks configured yet.</p>
                <Button onClick={onNavigateToManager} variant="outline">
                  Create Your First Task
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {tasks.map((task) => {
                  const isCompleted = isTaskCompleted(task.id);
                  return (
                    <button
                      key={task.id}
                      onClick={() => handleToggleCompletion(task.id)}
                      className={`w-full flex items-center gap-4 p-4 rounded-lg border-2 transition-all text-left ${
                        isCompleted
                          ? "border-green-300 bg-green-50"
                          : "border-gray-200 hover:border-indigo-300 bg-white hover:bg-indigo-50"
                      }`}
                    >
                      <div
                        className={`flex-shrink-0 text-2xl transition-colors ${
                          isCompleted ? "text-green-500" : "text-gray-300"
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="w-8 h-8" />
                        ) : (
                          <Circle className="w-8 h-8" />
                        )}
                      </div>
                      <div className="flex-1">
                        <p
                          className={`text-lg font-medium ${
                            isCompleted
                              ? "text-green-700 line-through"
                              : "text-gray-900"
                          }`}
                        >
                          {task.name}
                        </p>
                      </div>
                      {isCompleted && (
                        <div className="text-xs bg-green-200 text-green-800 px-3 py-1 rounded-full font-medium">
                          ✓ Done
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Completion message */}
        {completionCount === totalCount && totalCount > 0 && (
          <div className="mt-6 p-6 bg-gradient-to-r from-green-100 to-emerald-100 border border-green-300 rounded-lg text-center">
            <p className="text-xl font-bold text-green-800">🎉 Amazing! You've completed all your tasks for today!</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoutineTracker;
