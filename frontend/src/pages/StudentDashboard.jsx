import { useState, useEffect } from "react";
import {
  BookOpen,
  TrendingUp,
  Presentation,
  AlertCircle,
  Loader2,
} from "lucide-react";
import axios from "axios";

export default function StudentDashboard() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const userString = localStorage.getItem("user");
  const user = userString ? JSON.parse(userString) : null;

  useEffect(() => {
    fetchStudentAcademics();
  }, []);

  const fetchStudentAcademics = async () => {
    try {
      setLoading(true);
      // Since we don't have a complex student-dashboard aggregation route yet,
      // we will just fetch the courses for their department/semester for now as a baseline
      // Optional: build a `GET /api/student/my-courses` later that filters by their `className`
      const config = {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      };
      const res = await axios.get("http://localhost:5000/api/courses", config);

      // Filter logically on frontend if needed, but showing all for demo
      setCourses(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to load your academic profile.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Presentation
              size={22}
              className="text-indigo-600 dark:text-indigo-400"
            />
            My Academics Workspace
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Tracking {user?.department || "BCA"} • Roll {user?.rollNo || "N/A"}{" "}
            • Div {user?.division || "A"}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12">
          <Loader2 className="animate-spin text-indigo-500 h-8 w-8" />
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-2 text-sm font-medium">
          <AlertCircle size={16} /> {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
          {courses.map((course) => (
            <div
              key={course.id}
              className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <span className="bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 px-2 py-1 rounded text-xs font-bold font-mono">
                  {course.code}
                </span>
                <span className="bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 px-2 py-1 rounded text-xs font-medium">
                  {course.category}
                </span>
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 line-clamp-2">
                {course.name}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4">
                {course.theoryCredits + course.practicalCredits} Credits
              </p>

              <div className="border-t border-slate-100 dark:border-slate-700/60 pt-4 mt-auto">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <TrendingUp size={12} /> Personal CO Attainment
                  </span>
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Evaluating...
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                  <div className="h-full bg-indigo-500 w-0 rounded-full transition-all duration-1000" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
