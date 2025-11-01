import JournalApp from "./components/JournalApp";
import { useAuth } from "./AuthContext";
import { Button } from "./components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
import { BookOpen } from "lucide-react";

function App() {
  const { isAuthenticated, login, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <BookOpen className="w-16 h-16 text-purple-600" />
            </div>
            <CardTitle className="text-3xl">Welcome to QJournal</CardTitle>
            <CardDescription className="text-base">
              Your personal AI-powered journaling companion
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-gray-600">
              Sign in to start reflecting on your day and get personalized
              insights
            </p>
            <Button onClick={login} className="w-full" size="lg">
              Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <JournalApp />;
}

export default App;
