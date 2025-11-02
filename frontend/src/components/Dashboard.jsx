import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";

const Dashboard = ({ onNavigateToJournal, token }) => {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch("/api/journal/entries", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch entries");
      }

      const data = await response.json();
      setEntries(data.entries);
    } catch (err) {
      console.error("Error fetching entries:", err);
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
          <Button
            onClick={onNavigateToJournal}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            New Entry
          </Button>
        </div>

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
            ) : entries.length === 0 ? (
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
              <div className="space-y-4">
                {entries.map((entry) => (
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
                      <p className="text-gray-700 leading-relaxed">
                        {entry.oneLineSummary}
                      </p>
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

export default Dashboard;
