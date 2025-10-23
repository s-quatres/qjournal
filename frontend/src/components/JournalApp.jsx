import React, { useState } from "react";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Alert, AlertDescription } from "./ui/alert";
import { Loader2, BookOpen, Sparkles } from "lucide-react";

const JournalApp = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  const [answers, setAnswers] = useState({
    sleep: "",
    dancing: "",
    mood: "",
    gratitude: "",
    challenges: "",
    achievements: "",
    tomorrow: "",
  });

  const questions = [
    {
      id: "sleep",
      label: "Sleep",
      placeholder: "How did you sleep last night?",
    },
    {
      id: "dancing",
      label: "Dancing",
      placeholder:
        "What dancing did you do today, and if so who did you most enjoy dancing with, and did you learn anything?",
    },
    {
      id: "mood",
      label: "How are you feeling today?",
      placeholder: "Describe your mood and emotions...",
    },
    {
      id: "gratitude",
      label: "What are you grateful for today?",
      placeholder: "List 3 things or moments that you appreciated...",
    },
    {
      id: "challenges",
      label: "What challenges did you face?",
      placeholder: "Describe any difficulties...",
    },
    {
      id: "tomorrow",
      label: "What are you looking forward to tomorrow?",
      placeholder: "Set your intentions...",
    },
  ];

  const handleInputChange = (field, value) => {
    setAnswers((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log("Submitting journal answers:", answers);

      const response = await fetch("/api/journal/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ answers }),
      });

      console.log("Response status:", response.status);
      console.log("Response headers:", response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Response error text:", errorText);
        throw new Error(
          `Failed to generate summary (Status: ${response.status}). Response: ${errorText}`
        );
      }

      const data = await response.json();
      console.log("Received summary data:", data);
      setSummary(data.summary);
      setCurrentStep(questions.length);
    } catch (err) {
      console.error("Error in handleSubmit:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setCurrentStep(0);
    setAnswers({
      sleep: "",
      dancing: "",
      mood: "",
      gratitude: "",
      challenges: "",
      achievements: "",
      tomorrow: "",
    });
    setSummary(null);
    setError(null);
  };

  const currentQuestion = questions[currentStep];
  const isLastQuestion = currentStep === questions.length - 1;
  const canProceed = answers[currentQuestion?.id]?.trim().length > 0;

  if (currentStep === questions.length && summary) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4 flex items-center justify-center">
        <Card className="w-full max-w-2xl shadow-xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Sparkles className="w-12 h-12 text-purple-600" />
            </div>
            <CardTitle className="text-3xl">Your Journal Summary</CardTitle>
            <CardDescription>
              AI-generated insights and feedback
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gradient-to-r from-purple-100 to-blue-100 p-6 rounded-lg">
              <div className="prose max-w-none whitespace-pre-wrap">
                {summary}
              </div>
            </div>
            <Button onClick={handleReset} className="w-full">
              Start New Entry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4 flex items-center justify-center">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader>
          <div className="flex items-center justify-between mb-2">
            <BookOpen className="w-8 h-8 text-purple-600" />
            <span className="text-sm text-gray-500">
              Question {currentStep + 1} of {questions.length}
            </span>
          </div>
          <CardTitle className="text-2xl">{currentQuestion.label}</CardTitle>
          <CardDescription>
            Take your time and reflect on your day
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor={currentQuestion.id}>Your response</Label>
            <Textarea
              id={currentQuestion.id}
              value={answers[currentQuestion.id]}
              onChange={(e) =>
                handleInputChange(currentQuestion.id, e.target.value)
              }
              placeholder={currentQuestion.placeholder}
              rows={6}
              className="resize-none"
            />
          </div>

          <div className="flex gap-3">
            {currentStep > 0 && (
              <Button variant="outline" onClick={handleBack} className="flex-1">
                Back
              </Button>
            )}
            {!isLastQuestion ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed}
                className="flex-1"
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={!canProceed || loading}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  "Get Summary & Feedback"
                )}
              </Button>
            )}
          </div>

          <div className="flex gap-2 justify-center pt-4">
            {questions.map((_, idx) => (
              <div
                key={idx}
                className={`h-2 w-2 rounded-full transition-all ${
                  idx === currentStep
                    ? "bg-purple-600 w-8"
                    : idx < currentStep
                    ? "bg-purple-400"
                    : "bg-gray-300"
                }`}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default JournalApp;
