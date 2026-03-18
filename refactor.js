const fs = require('fs');
const files = [
  'backend/server.js',
  'frontend/src/components/AddCourseModal.jsx',
  'frontend/src/pages/Classes.jsx',
  'frontend/src/pages/StudentDashboard.jsx'
];

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  
  if (f.includes('Classes.jsx')) {
    content = content.replace(/\{selectedStream === 'BCA' && \(/g, '{true /* Always show Semester */ && (');
  }
  
  if (f.includes('AddCourseModal.jsx')) {
    content = content.replace(/ac\.name\.includes\(formData\.stream\)/g, 'ac.name.endsWith(formData.stream)');
  }

  content = content.replace(/\bstream\b/g, 'department');
  content = content.replace(/\bstreams\b/g, 'departments');
  content = content.replace(/\bStream\b/g, 'Department');
  content = content.replace(/\bStreams\b/g, 'Departments');
  content = content.replace(/\bselectedStream\b/g, 'selectedDepartment');
  content = content.replace(/\bsetSelectedStream\b/g, 'setSelectedDepartment');
  
  fs.writeFileSync(f, content);
});
console.log('Refactor script completed successfully.');
