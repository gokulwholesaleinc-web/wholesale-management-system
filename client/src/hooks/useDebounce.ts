import { useEffect, useState } from 'react';

export function useDebounce<T>(value: T, ms = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    const id = setTimeout(() => setDebouncedValue(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  
  return debouncedValue;
}