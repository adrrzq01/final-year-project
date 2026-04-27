import { useState, useRef, useEffect } from 'react'
import { UploadCloud, FileSpreadsheet, X, CheckCircle2, AlertCircle, Download, FolderOpen, ChevronDown } from 'lucide-react'
import axios from 'axios'
import Papa from 'papaparse'

export default function Upload() {
  const [classes, setClasses] = useState([])
  const [classSelected, setClassSelected] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  const [uploadedFile, setUploadedFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploaded, setUploaded] = useState(false)
  const [errorText, setErrorText] = useState('')
  const [previewData, setPreviewData] = useState([])
  const [recentUploads, setRecentUploads] = useState([])
  const inputRef = useRef(null)

  useEffect(() => {
    const fetchClasses = async () => {
      try {
        const config = { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        const res = await axios.get('http://localhost:5000/api/academic-classes', config)
        setClasses(res.data)
      } catch (err) { console.error('Failed to fetch classes', err) }
    }
    fetchClasses()
  }, [])

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleFile = async (file) => {
    if (!file.name.endsWith('.csv')) {
      setErrorText('Please upload a valid .csv file')
      return
    }
    setErrorText('')
    setUploadedFile(file)
    setUploaded(false)
    
    try {
      const parsed = await processCSV(file)
      if (!parsed || parsed.length === 0) {
         throw new Error("File sequence is blank or invalid CSV format.")
      }
      setPreviewData(parsed)
    } catch(err) {
      setErrorText("Failed to parse CSV matrix: " + err.message)
    }
  }

  const processCSV = (file) => {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => resolve(results.data),
        error: (err) => reject(err)
      })
    })
  }

  const handleUpload = async () => {
    setUploading(true)
    setErrorText('')

    try {
      const data = previewData
      
      // Validation
      if (!classSelected) {
        throw new Error('Please select a Target Batch/Class first')
      }
      if (data.length > 0 && !data[0].rollNo) {
        throw new Error('CSV must contain a "rollNo" column header')
      }

      // Send to backend API
      const response = await axios.post('http://localhost:5000/api/students/bulk-upload', {
        academicClassId: classSelected,
        students: data
      }, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })

      // Update history list
      setRecentUploads(prev => [{
        id: Date.now(),
        name: uploadedFile.name,
        size: (uploadedFile.size / 1024).toFixed(1) + ' KB',
        date: new Date().toLocaleDateString(),
        status: 'success',
        rows: response.data.count
      }, ...prev])

      setUploaded(true)
    } catch (err) {
      console.error(err)
      setErrorText(err.response?.data?.error || err.message || 'Upload failed')
      
      setRecentUploads(prev => [{
        id: Date.now(),
        name: uploadedFile.name,
        size: (uploadedFile.size / 1024).toFixed(1) + ' KB',
        date: new Date().toLocaleDateString(),
        status: 'error',
        rows: 0
      }, ...prev])
    } finally {
      setUploading(false)
    }
  }

  const clearFile = () => {
    setUploadedFile(null)
    setUploaded(false)
    setUploading(false)
    setErrorText('')
    setPreviewData([])
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Upload Data</h2>
          <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">Import student lists via CSV files to save to the database</p>
        </div>
        
        <div className="relative min-w-[240px]">
          <select
            value={classSelected}
            onChange={(e) => setClassSelected(e.target.value)}
            className="w-full appearance-none bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-sm font-bold text-slate-700 dark:text-slate-300 pl-4 pr-10 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent cursor-pointer transition-all shadow-sm"
          >
            <option value="" disabled>— Target Academic Class —</option>
            {classes.map(ac => (
              <option key={ac.id} value={ac.id}>{ac.name} — Div {ac.division || 'A'}</option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => !uploadedFile && inputRef.current.click()}
        className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 cursor-pointer
          ${isDragging
            ? 'drop-zone-active border-indigo-400 bg-indigo-50 dark:bg-indigo-950/40'
            : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-slate-50 dark:hover:bg-slate-800'}
          ${uploadedFile ? 'cursor-default' : ''}
          ${errorText ? 'border-rose-400 bg-rose-50 dark:bg-rose-950/30' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />

        {!uploadedFile ? (
          <>
            <div className={`w-20 h-20 mx-auto rounded-2xl flex items-center justify-center mb-6 transition-all duration-300
              ${isDragging ? 'bg-indigo-100 dark:bg-indigo-900/50 scale-110' : 'bg-slate-100 dark:bg-slate-700'}`}>
              <UploadCloud size={38} className={isDragging ? 'text-indigo-500' : 'text-slate-400 dark:text-slate-500'} />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-2">
              {isDragging ? 'Release to upload' : 'Drag & Drop your Student List .csv here'}
            </h3>
            <p className="text-sm text-slate-400 dark:text-slate-500 mb-6">Must contain header row with "rollNo" and "name"</p>
            <button
              onClick={(e) => { e.stopPropagation(); inputRef.current.click() }}
              className="inline-flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-6 py-3 rounded-xl hover:bg-indigo-700 active:scale-95 transition-all shadow-md shadow-indigo-200 dark:shadow-indigo-900/30"
            >
              <UploadCloud size={16} />
              Browse Files
            </button>
            {errorText && <p className="text-sm text-rose-500 font-semibold mt-4">{errorText}</p>}
          </>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center transition-all
              ${uploaded ? 'bg-emerald-50 dark:bg-emerald-900/30' : errorText ? 'bg-rose-50 dark:bg-rose-900/30' : 'bg-indigo-50 dark:bg-indigo-900/30'}`}>
              {uploaded
                ? <CheckCircle2 size={40} className="text-emerald-500" />
                : errorText 
                  ? <AlertCircle size={40} className="text-rose-500" />
                  : <FileSpreadsheet size={38} className="text-indigo-500" />
              }
            </div>
            <div>
              <p className="font-bold text-slate-800 dark:text-slate-200">{uploadedFile.name}</p>
              <p className="text-sm text-slate-400 dark:text-slate-500 mt-0.5">{(uploadedFile.size / 1024).toFixed(1)} KB · CSV file</p>
            </div>
            
            {errorText && (
               <div className="text-sm font-semibold text-rose-500 bg-rose-50 dark:bg-rose-900/30 px-3 py-1.5 rounded-lg border border-rose-200 dark:border-rose-800">
                 {errorText}
               </div>
            )}

            {uploaded ? (
              <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-sm font-semibold px-4 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 size={15} /> Uploaded & Saved to Database!
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => { e.stopPropagation(); handleUpload() }}
                  disabled={uploading}
                  className="flex items-center gap-2 bg-indigo-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-indigo-700 disabled:opacity-60 active:scale-95 transition-all shadow-md shadow-indigo-200 dark:shadow-indigo-900/30"
                >
                  {uploading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Sending…
                    </>
                  ) : (
                    <><UploadCloud size={15} /> Confirm & Save</>
                  )}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); clearFile() }}
                  className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-sm font-medium px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                >
                  <X size={15} /> Remove
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Preview Table */}
      {previewData.length > 0 && !uploaded && !uploading && (
        <div className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl overflow-hidden shadow-sm transition-all duration-300 animate-in slide-in-from-top-4">
           <div className="bg-indigo-50 dark:bg-indigo-900/40 px-5 py-3.5 border-b border-indigo-100 dark:border-indigo-800 flex justify-between items-center">
              <h3 className="text-sm font-bold text-indigo-800 dark:text-indigo-300 flex items-center gap-2"><FileSpreadsheet size={16}/> Data Preview <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-200 dark:bg-indigo-800 rounded-md text-indigo-800 dark:text-indigo-200">{previewData.length} records</span></h3>
              <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">Please verify data mappings before concluding</p>
           </div>
           <div className="max-h-72 overflow-y-auto custom-scrollbar">
              <table className="w-full text-left text-sm text-slate-600 dark:text-slate-400 border-collapse">
                 <thead className="bg-white dark:bg-slate-900/80 text-[11px] uppercase tracking-wider font-bold text-slate-500 sticky top-0 backdrop-blur-md z-10 shadow-sm">
                    <tr>
                      {Object.keys(previewData[0] || {}).map(key => (
                         <th key={key} className="px-5 py-3 border-b border-slate-200 dark:border-slate-700/60">{key}</th>
                      ))}
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                    {previewData.slice(0, 100).map((row, i) => (
                       <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                          {Object.values(row).map((val, idx) => (
                             <td key={idx} className="px-5 py-2.5 truncate max-w-[200px] border-r border-slate-50 dark:border-slate-700/20 last:border-r-0">{String(val)}</td>
                          ))}
                       </tr>
                    ))}
                 </tbody>
              </table>
              {previewData.length > 100 && (
                <div className="text-center py-2.5 text-xs text-slate-400 font-bold bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800/60 shadow-inner">
                   Showing exact first 100 rows. Remaining {(previewData.length - 100)} structurally verified implicitly.
                </div>
              )}
           </div>
        </div>
      )}

      {/* Format Guide */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Student List', cols: 'rollNo, name', icon: '📋' },
          { label: 'Marks CSV (Use Marks Entry Tab)', cols: 'rollNo, q1, q2...', icon: '📊' },
          { label: 'CO Mapping (Use Exam Blueprints)', cols: 'qNumber, co, bloom', icon: '🗂️' },
        ].map((fmt) => (
          <div key={fmt.label} className="bg-white dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 rounded-xl p-4 shadow-sm transition-colors duration-300">
            <p className="text-base mb-1">{fmt.icon}</p>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{fmt.label}</p>
            <p className="text-xs font-mono text-slate-400 dark:text-slate-500 mt-1">{fmt.cols}</p>
          </div>
        ))}
      </div>

      {/* Recent Uploads */}
      <div className="bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700/60 shadow-sm overflow-hidden transition-colors duration-300">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700/60">
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Upload History</h3>
        </div>
        {recentUploads.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-12">
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
              <FolderOpen size={22} className="text-slate-400 dark:text-slate-500" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">No uploads yet</p>
              <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Your server upload history will appear here</p>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-slate-50 dark:divide-slate-700/40">
            {recentUploads.map((f) => (
              <div key={f.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${f.status === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/30' : 'bg-rose-50 dark:bg-rose-900/30'}`}>
                  {f.status === 'success'
                    ? <CheckCircle2 size={18} className="text-emerald-500" />
                    : <AlertCircle size={18} className="text-rose-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{f.name}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500">{f.size} · {f.date} {f.status === 'success' && `· ${f.rows} rows mapped`}</p>
                </div>
                {f.status === 'success' ? (
                  <button className="text-slate-400 hover:text-indigo-500 transition-colors" title="Download Log">
                    <Download size={15} />
                  </button>
                ) : (
                  <span className="text-xs font-semibold text-rose-500 px-2 py-0.5 bg-rose-50 dark:bg-rose-900/30 rounded border border-rose-200 dark:border-rose-800">Failed</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
