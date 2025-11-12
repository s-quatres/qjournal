import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { CheckSquare, AlertCircle, Calendar } from "lucide-react";
import { ensureTokenValid } from "../AuthContext";

const Dashboard = ({ onNavigateToJournal, onNavigateToJournalForDate, onNavigateToRoutine, keycloak }) => {
  const [entries, setEntries] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [completions, setCompletions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [pickedDate, setPickedDate] = useState(new Date().toISOString().split("T")[0]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      await ensureTokenValid();

      // Fetch journal entries
      const entriesResponse = await fetch("/api/journal/entries", {
        headers: {
          Authorization: `Bearer ${keycloak.token}`,
          "Content-Type": "application/json",
        },
      });

      if (!entriesResponse.ok) {
        throw new Error("Failed to fetch entries");
      }

      const entriesData = await entriesResponse.json();
      setEntries(entriesData.entries);

      // Fetch all tasks
      const tasksResponse = await fetch("/api/tasks", {
        headers: {
          Authorization: `Bearer ${keycloak.token}`,
          "Content-Type": "application/json",
        },
      });

      if (!tasksResponse.ok) {
        throw new Error("Failed to fetch tasks");
      }

      const tasksData = await tasksResponse.json();
      const enabledTasks = tasksData.tasks.filter((t) => t.enabled);
      setTasks(enabledTasks);

      // Fetch today's completions
      const today = new Date().toISOString().split("T")[0];
      const completionsResponse = await fetch(
        `/api/tasks/completions/${today}`,
        {
          headers: {
            Authorization: `Bearer ${keycloak.token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!completionsResponse.ok) {
        throw new Error("Failed to fetch completions");
      }

      const completionsData = await completionsResponse.json();
      const completionCount = completionsData.completions.length;
      setCompletions({
        today: completionCount,
        total: enabledTasks.length,
      });
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getContentmentColor = (score) => {
    if (score === null || score === undefined) return "bg-gray-400";
    if (score <= 2) return "bg-red-500";
    if (score <= 4) return "bg-orange-500";
    if (score <= 6) return "bg-yellow-500";
    if (score <= 8) return "bg-green-500";
    return "bg-emerald-500";
  };

  const getContentmentLabel = (score) => {
    if (score === null || score === undefined) return "N/A";
    if (score <= 2) return "Struggling";
    if (score <= 4) return "Challenged";
    if (score <= 6) return "Neutral";
    if (score <= 8) return "Content";
    return "Very Happy";
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getTodayDate = () => {
    return new Date().toISOString().split("T")[0];
  };

  const hasTodayEntry = () => {
    const today = getTodayDate();
    return entries.some((entry) => entry.date.split("T")[0] === today);
  };

  const averageContentment =
    entries.length > 0
      ? (
          entries.reduce(
            (sum, entry) => sum + (entry.contentmentScore || 0),
            0
          ) / entries.length
        ).toFixed(1)
      : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Your Journal Dashboard
            </h1>
            <p className="text-gray-600">
              Track your contentment journey over time
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={onNavigateToRoutine}
              variant="outline"
              className="flex items-center gap-2"
            >
              <CheckSquare className="w-4 h-4" />
              Daily Routine
            </Button>
            <Button
              onClick={() => setShowDatePicker(!showDatePicker)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Calendar className="w-4 h-4" />
              Past Entry
            </Button>
            <Button
              onClick={onNavigateToJournal}
              className="bg-indigo-600 hover:bg-indigo-700"
            >
              New Entry
            </Button>
          </div>
        </div>

        {/* Date Picker Modal */}
        {showDatePicker && (
          <Card className="mb-8 bg-white/80 backdrop-blur border-2 border-indigo-300">
            <CardHeader>
              <CardTitle>Create Entry for a Specific Date</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    Select Date
                  </label>
                  <input
                    type="date"
                    value={pickedDate}
                    onChange={(e) => setPickedDate(e.target.value)}
                    max={new Date().toISOString().split("T")[0]}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      onNavigateToJournalForDate(pickedDate);
                      setShowDatePicker(false);
                    }}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                  >
                    Start Entry
                  </Button>
                  <Button
                    onClick={() => setShowDatePicker(false)}
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Card */}
        <Card className="mb-8 bg-white/80 backdrop-blur">
          <CardHeader>
            <CardTitle>Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total Entries</p>
                <p className="text-3xl font-bold text-indigo-600">
                  {entries.length}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Average Contentment</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-3xl font-bold text-indigo-600">
                    {averageContentment}
                  </p>
                  <p className="text-sm text-gray-500">/ 10</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Entries List */}
        <Card className="bg-white/80 backdrop-blur">
          <CardHeader>
            <CardTitle>Recent Entries</CardTitle>
            <CardDescription>Your last 10 journal entries</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-600">
                Loading your entries...
              </div>
            ) : error ? (
              <div className="text-center py-8 text-red-600">
                Error: {error}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Journal Pending Tile - show if no entry for today */}
                {!hasTodayEntry() && (
                  <div className="flex items-start gap-4 p-4 rounded-lg border border-amber-200 bg-amber-50 hover:border-amber-300 transition-all">
                    <div className="flex-shrink-0">
                      <div className="w-16 h-16 rounded-lg bg-amber-400 flex flex-col items-center justify-center text-white shadow-lg">
                        <AlertCircle className="w-8 h-8" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-gray-900">Today</p>
                        <span className="px-2 py-1 rounded-full text-xs font-medium text-white bg-amber-500">
                          Journal Pending
                        </span>
                      </div>
                      <p className="text-gray-700 leading-relaxed mb-3">
                        No entry yet for today. Take a moment to reflect on your
                        day!
                      </p>
                      <div className="flex items-center gap-4 text-sm">
                        <div>
                          <p className="text-gray-600">Tasks Completed</p>
                          <p className="text-lg font-bold text-amber-600">
                            {completions.today ?? 0} / {completions.total ?? 0}
                          </p>
                        </div>
                        <Button
                          onClick={onNavigateToJournal}
                          className="bg-amber-500 hover:bg-amber-600 ml-auto"
                        >
                          Add Entry
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Past Entries */}
                {entries.length === 0 && hasTodayEntry() ? (
                  <div className="text-center py-8 text-gray-600">
                    <p className="mb-4">
                      No entries yet. Start your journaling journey!
                    </p>
                    <Button
                      onClick={onNavigateToJournal}
                      className="bg-indigo-600 hover:bg-indigo-700"
                    >
                      Create First Entry
                    </Button>
                  </div>
                ) : (
                  entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-start gap-4 p-4 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/50 transition-all"
                    >
                      <div className="flex-shrink-0">
                        <div
                          className={`w-16 h-16 rounded-lg ${getContentmentColor(
                            entry.contentmentScore
                          )} flex flex-col items-center justify-center text-white shadow-lg`}
                        >
                          <div className="text-2xl font-bold">
                            {entry.contentmentScore ?? "?"}
                          </div>
                          <div className="text-xs opacity-90">/ 10</div>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-gray-900">
                            {formatDate(entry.date)}
                          </p>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium text-white ${getContentmentColor(
                              entry.contentmentScore
                            )}`}
                          >
                            {getContentmentLabel(entry.contentmentScore)}
                          </span>
                        </div>
                        <p className="text-gray-700 leading-relaxed mb-2">
                          {entry.oneLineSummary}
                        </p>
                        <div className="text-sm text-gray-600">
                          <CheckSquare className="inline w-4 h-4 mr-1" />
                          Tasks completed that day: {entry.tasksCompleted ??
                            0}{" "}
                          / {completions.total ?? 0}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
