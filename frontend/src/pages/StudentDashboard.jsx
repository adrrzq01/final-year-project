import { useState, useEffect } from "react";
import { useCachedState } from "../context/PageCacheContext";
import { BookOpen, TrendingUp, Presentation, AlertCircle, Loader2, ClipboardCheck, Star, X } from "lucide-react";
import axios from "axios";
import { useAlert } from "../context/AlertContext";

export default function StudentDashboard() {
  const [courses, setCourses] = useState([]);
  const [pendingSurveys, setPendingSurveys] = useState([]);
  const [myMarks, setMyMarks] = useState([]);
  const [courseAttainmentMap, setCourseAttainmentMap] = useState({});
  const [currentSem, setCurrentSem] = useState(1);
  const [targetSem, setTargetSem] = useCachedState("stud_targetSem", 1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const { showAlert } = useAlert();
  
  // Survey Modal State
  const [activeSurvey, setActiveSurvey] = useCachedState("stud_activeSurvey", null);
  const [ratings, setRatings] = useCachedState("stud_ratings", {});
  const [submitting, setSubmitting] = useState(false);

  const userString = localStorage.getItem("user");
  const user = userString ? JSON.parse(userString) : null;
  const className = user?.className || '';
  let availableSems = [1, 2, 3, 4, 5, 6];
  if (className.startsWith('FY')) availableSems = [1, 2];
  else if (className.startsWith('SY')) availableSems = [3, 4];
  else if (className.startsWith('TY')) availableSems = [5, 6];

  useEffect(() => {
    // default to the first available sem for their year, or just let backend decide if no param
    fetchDashboardData(availableSems[0]);
  }, []);

  const fetchDashboardData = async (sem) => {
    try {
      setLoading(true);
      const config = { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } };
      
      const querySem = sem ? `?sem=${sem}` : "";

      const [coursesRes, surveysRes, marksRes] = await Promise.all([
        axios.get(`http://localhost:5000/api/student/dashboard${querySem}`, config),
        axios.get("http://localhost:5000/api/student/pending-surveys", config),
        axios.get(`http://localhost:5000/api/student/marks${querySem}`, config)
      ]);

      setCourses(coursesRes.data);
      setPendingSurveys(surveysRes.data);
      
      const marksPayload = marksRes.data.courses || [];
      setMyMarks(marksPayload);
      setCurrentSem(marksRes.data.currentSemester || 1);
      setTargetSem(sem || marksRes.data.targetSemester || 1);

      // Build CO attainment map: courseId -> pct (keyed by course.id from marksList)
      const attMap = {};
      marksPayload.forEach(course => {
        const total = course.marksList?.length || 0;
        if (total === 0) { attMap[course.id] = null; return; }
        const passed = course.marksList.filter(m => m.pass === true).length;
        attMap[course.id] = Math.round((passed / total) * 100);
      });
      setCourseAttainmentMap(attMap);
    } catch (err) {
      console.error(err);
      setError("Failed to load your academic profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleRatingSelect = (coId, rating) => {
    setRatings(prev => ({ ...prev, [coId]: rating }));
  };

  const submitSurvey = async () => {
    // Validate all COs are rated
    const unrated = activeSurvey.courseOutcomes.filter(co => !ratings[co.id]);
    if (unrated.length > 0) {
      showAlert("Please rate all Course Outcomes before submitting.", "warning");
      return;
    }

    try {
      setSubmitting(true);
      const config = { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } };
      
      const payload = {
        courseId: activeSurvey.id,
        studentId: activeSurvey.studentId,
        ratings: Object.keys(ratings).map(coId => ({
          courseOutcomeId: coId,
          rating: ratings[coId]
        }))
      };

      await axios.post("http://localhost:5000/api/student/submit-survey", payload, config);
      
      // Update UI
      setPendingSurveys(prev => prev.filter(s => s.id !== activeSurvey.id));
      setActiveSurvey(null);
      setRatings({});
      showAlert("Survey submitted successfully! Thank you.", "success");
    } catch(err) {
      console.error(err);
      showAlert("Failed to submit survey.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Presentation size={22} className="text-indigo-600 dark:text-indigo-400" />
            My Academics Workspace
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Tracking {user?.department || "BCA"} • Roll {user?.rollNo || "N/A"} • Div {user?.division || "A"}
          </p>
        </div>
        
        <div className="flex items-center gap-3 bg-white dark:bg-slate-800 p-2 px-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">View Semester:</span>
          <select 
            value={targetSem}
            onChange={(e) => fetchDashboardData(parseInt(e.target.value))}
            className="bg-transparent border-none text-sm font-bold text-indigo-600 dark:text-indigo-400 focus:ring-0 cursor-pointer outline-none"
          >
            {availableSems.map(sem => (
              <option key={sem} value={sem} className="text-slate-800 dark:text-slate-200">Semester {sem}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-12"><Loader2 className="animate-spin text-indigo-500 h-8 w-8" /></div>
      ) : error ? (
        <div className="p-4 bg-red-50 text-red-600 rounded-xl flex items-center gap-2 text-sm font-medium"><AlertCircle size={16} /> {error}</div>
      ) : (
        <>
          {/* Pending Surveys Warning Block */}
          {pendingSurveys.length > 0 && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-700/50 rounded-2xl p-6 shadow-sm animate-in fade-in slide-in-from-top-4">
              <h3 className="text-lg font-bold text-amber-900 dark:text-amber-200 flex items-center gap-2 mb-3">
                <ClipboardCheck size={20} className="text-amber-600 dark:text-amber-400" />
                Action Required: Pending Surveys
              </h3>
              <p className="text-sm text-amber-800 dark:text-amber-300 mb-5 max-w-3xl">
                Please complete the Course Exit Surveys for your enrolled courses. Your feedback on Course Outcome comprehension is required to finalize the Indirect Assessment analytics.
              </p>
              
              <div className="flex flex-wrap gap-4">
                {pendingSurveys.map(course => (
                  <button 
                    key={course.id}
                    onClick={() => { setActiveSurvey(course); setRatings({}); }}
                    className="flex items-center gap-3 bg-white hover:bg-amber-100 dark:bg-slate-800 dark:hover:bg-amber-900/40 text-slate-800 dark:text-slate-200 px-5 py-3 rounded-xl border border-amber-200 dark:border-amber-700/50 font-semibold text-sm transition-all focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
                  >
                    <span className="bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-400 font-bold px-2 py-1 rounded text-xs">{course.code}</span>
                    {course.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Academic Courses Grid */}
          <div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-4">My Enrolled Courses</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
              {courses.map((course) => (
                <div key={course.id} className="bg-white dark:bg-slate-800 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <span className="bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 px-2 py-1 rounded text-xs font-bold font-mono">
                      {course.code}
                    </span>
                    <span className="bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300 px-2 py-1 rounded text-xs font-medium">
                      {course.category}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 line-clamp-2 relative z-10">
                    {course.name}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 mb-4 relative z-10">
                    {course.theoryCredits + course.practicalCredits} Credits
                  </p>

                  <div className="border-t border-slate-100 dark:border-slate-700/60 pt-4 mt-auto relative z-10">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <TrendingUp size={12} /> Personal CO Attainment
                      </span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {courseAttainmentMap[course.id] !== undefined && courseAttainmentMap[course.id] !== null
                          ? `${courseAttainmentMap[course.id]}%`
                          : 'No Data'}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-1000 ${
                          (courseAttainmentMap[course.id] || 0) >= 60
                            ? 'bg-emerald-500'
                            : (courseAttainmentMap[course.id] || 0) >= 40
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                        }`}
                        style={{ width: `${courseAttainmentMap[course.id] || 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Marks Transcript */}
          <div className="pt-8">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
               <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                  <BookOpen size={20} className="text-indigo-500" />
                  My Official Marks Transcript
               </h3>
             </div>
             
             {myMarks.length === 0 ? (
                <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/60 p-12 text-center shadow-sm animate-in fade-in">
                   <div className="mx-auto w-14 h-14 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-500 flex items-center justify-center rounded-2xl mb-4 shadow-sm border border-indigo-100 dark:border-indigo-800">
                     <BookOpen size={28} />
                   </div>
                   <h4 className="text-slate-800 dark:text-slate-200 font-bold text-lg mb-2">No Academic Records Available</h4>
                   <p className="text-slate-500 dark:text-slate-400 text-sm max-w-md mx-auto leading-relaxed">
                     We could not find any exam or assessment records for <strong>Semester {targetSem}</strong>. If this is a new platform deployment, historic legacy marks may not be migrated yet.
                   </p>
                </div>
             ) : (
                <div className="space-y-6">
                   {myMarks.map(course => (
                      <div key={course.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/60 overflow-hidden shadow-sm animate-in fade-in">
                      {/* Course Header Bar */}
                      <div className="bg-slate-50 dark:bg-slate-900/50 px-6 py-4 border-b border-slate-200 dark:border-slate-700/60 flex items-center justify-between">
                         <div>
                            <span className="text-indigo-600 dark:text-indigo-400 font-bold font-mono text-sm">{course.code}</span>
                            <h4 className="text-slate-800 dark:text-slate-200 font-bold ml-3 inline-block">{course.name}</h4>
                         </div>
                      </div>

                      {/* Marks Matrix */}
                      {course.marksList && course.marksList.length > 0 ? (
                         <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                               <thead>
                                  <tr className="bg-white dark:bg-slate-800 border-b border-slate-100 dark:border-slate-700/60">
                                     <th className="px-6 py-3 text-slate-500 font-semibold w-32">Exam Type</th>
                                     <th className="px-6 py-3 text-slate-500 font-semibold w-24 text-center">Question</th>
                                     <th className="px-6 py-3 text-slate-500 font-semibold w-24 text-center">Outcome</th>
                                     <th className="px-6 py-3 text-slate-500 font-semibold w-32 text-center">Max Marks</th>
                                     <th className="px-6 py-3 text-slate-800 dark:text-slate-200 font-bold text-center">Score Obtained</th>
                                     <th className="px-6 py-3 text-slate-500 font-semibold text-center rounded-tr-2xl">40% ATTAINMENT</th>
                                  </tr>
                               </thead>
                               <tbody className="divide-y divide-slate-50 dark:divide-slate-700/30">
                                  {course.marksList.map((m, idx) => (
                                     <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="px-6 py-2.5 text-slate-600 dark:text-slate-400 font-medium">
                                           {m.examCode}
                                        </td>
                                        <td className="px-6 py-2.5 text-slate-500 font-mono text-center">
                                           {m.qLabel}
                                        </td>
                                        <td className="px-6 py-2.5 text-slate-500 font-mono text-center text-xs">
                                           <span className="bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded">{m.co}</span>
                                        </td>
                                        <td className="px-6 py-2.5 text-slate-500 text-center font-semibold">
                                           {m.max}
                                        </td>
                                        <td className="px-6 py-2.5 text-center font-black text-indigo-700 dark:text-indigo-400 text-base">
                                           {m.got !== null ? m.got : <span className="text-slate-300 font-normal dark:text-slate-600">-</span>}
                                        </td>
                                        <td className="px-6 py-2.5 text-center">
                                           {m.pass === true 
                                             ? <span className="inline-block bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 px-3 py-1 rounded text-xs font-bold w-16 text-center">PASS</span>
                                             : m.pass === false 
                                               ? <span className="inline-block bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-400 px-3 py-1 rounded text-xs font-bold w-16 text-center">FAIL</span>
                                               : <span className="inline-block bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500 px-3 py-1 rounded text-xs font-bold w-16 text-center">N/A</span>
                                           }
                                        </td>
                                     </tr>
                                  ))}
                               </tbody>
                            </table>
                         </div>
                      ) : (
                         <div className="px-6 py-8 text-center text-slate-400 dark:text-slate-500 text-sm font-medium">
                            No exam data captured for this course yet.
                         </div>
                      )}
                   </div>
                ))}
             </div>
            )}
          </div>
        </>
      )}

      {/* Fullscreen Survey Modal Layer */}
      {activeSurvey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 dark:bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border border-slate-200 dark:border-slate-700 shadow-slate-900/10">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 dark:border-slate-700/60 bg-indigo-600 dark:bg-indigo-900 text-white">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <ClipboardCheck size={24} />
                  Course Exit Survey
                </h2>
                <p className="text-indigo-200 text-sm mt-1">{activeSurvey.code} - {activeSurvey.name}</p>
              </div>
              <button onClick={() => setActiveSurvey(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors text-indigo-100 hover:text-white">
                <X size={24} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-8 overflow-y-auto flex-1 bg-slate-50/50 dark:bg-slate-900/50">
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-6 bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700">
                Rate your understanding and proficiency for each of the following Course Outcomes on a scale from 1 to 3. 
                <span className="block mt-2 font-bold text-slate-800 dark:text-slate-200">1 = Low &nbsp; | &nbsp; 2 = Moderate &nbsp; | &nbsp; 3 = High</span>
              </p>

              <div className="space-y-4">
                {activeSurvey.courseOutcomes.map(co => (
                  <div key={co.id} className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700/60 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex-1">
                      <span className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300 font-bold px-2 py-1 rounded text-xs inline-block mb-2 font-mono">
                        {co.coNumber}
                      </span>
                      <p className="text-slate-700 dark:text-slate-300 font-medium leading-relaxed">{co.description}</p>
                    </div>
                    
                    <div className="flex items-center gap-3 shrink-0 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-xl border border-slate-100 dark:border-slate-700/50">
                      {[1, 2, 3].map(val => (
                        <button
                          key={val}
                          onClick={() => handleRatingSelect(co.id, val)}
                          className={`w-12 h-12 rounded-lg flex items-center justify-center font-bold text-lg transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500
                            ${ratings[co.id] === val 
                              ? "bg-amber-400 text-white shadow-md shadow-amber-400/20 scale-105" 
                              : "bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 hover:border-amber-400 hover:text-amber-500"
                            }`}
                        >
                          {ratings[co.id] === val ? <Star fill="currentColor" size={20} /> : val}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-700/60 bg-white dark:bg-slate-800 flex justify-end gap-3">
              <button 
                onClick={() => setActiveSurvey(null)}
                className="px-6 py-2.5 rounded-xl font-bold text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors focus:outline-none"
              >
                Cancel
              </button>
              <button 
                onClick={submitSurvey}
                disabled={submitting}
                className="px-8 py-2.5 rounded-xl font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                Submit Ratings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
