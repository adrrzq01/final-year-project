import { createContext, useContext, useRef, useState, useEffect } from 'react';

const PageCacheContext = createContext();

export function PageCacheProvider({ children }) {
  const cache = useRef({});
  
  const clearCache = (prefix) => {
    if (!prefix) {
      cache.current = {};
      return;
    }
    Object.keys(cache.current).forEach(key => {
      if (key.startsWith(prefix)) {
        delete cache.current[key];
      }
    });
  };

  return (
    <PageCacheContext.Provider value={{ cache: cache.current, clearCache }}>
      {children}
    </PageCacheContext.Provider>
  );
}

export function useCachedState(key, initialValue) {
  const { cache } = useContext(PageCacheContext);
  
  const [state, setState] = useState(() => {
    if (cache[key] !== undefined) {
      return cache[key];
    }
    return typeof initialValue === 'function' ? initialValue() : initialValue;
  });

  useEffect(() => {
    cache[key] = state;
  }, [key, state, cache]);

  return [state, setState];
}

export function useCache() {
  return useContext(PageCacheContext);
}
