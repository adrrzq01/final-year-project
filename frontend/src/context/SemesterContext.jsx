import { createContext, useState, useContext, useEffect } from 'react';

const SemesterContext = createContext();

export function SemesterProvider({ children }) {
  const [activeSemester, setActiveSemester] = useState(() => {
    return localStorage.getItem('activeSemester') || '1';
  });

  useEffect(() => {
    localStorage.setItem('activeSemester', activeSemester);
  }, [activeSemester]);

  return (
    <SemesterContext.Provider value={{ activeSemester, setActiveSemester }}>
      {children}
    </SemesterContext.Provider>
  );
}

export const useSemester = () => useContext(SemesterContext);
