
"use client"

import { useState, useEffect, useCallback } from 'react';

function getValue<T>(key: string, initialValue: T | (() => T)) {
  if (typeof window === 'undefined') {
    return initialValue instanceof Function ? initialValue() : initialValue;
  }
  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : (initialValue instanceof Function ? initialValue() : initialValue);
  } catch (error) {
    console.warn(`Error reading localStorage key “${key}”:`, error);
    return initialValue instanceof Function ? initialValue() : initialValue;
  }
}

export function useLocalStorage<T>(key: string, initialValue: T | (() => T)): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => getValue(key, initialValue));

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        // Dispatch a storage event to notify other tabs
        window.dispatchEvent(new StorageEvent('storage', { key, newValue: JSON.stringify(valueToStore) }));
      }
    } catch (error) {
      console.warn(`Error setting localStorage key “${key}”:`, error);
    }
  };
  
  const handleStorageChange = useCallback((event: StorageEvent) => {
    if (event.key === key && event.newValue) {
      try {
        setStoredValue(JSON.parse(event.newValue));
      } catch (error) {
        console.warn(`Error parsing storage event for key “${key}”:`, error);
      }
    }
  }, [key]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
      return () => {
        window.removeEventListener('storage', handleStorageChange);
      };
    }
  }, [key, handleStorageChange]);

  return [storedValue, setValue as React.Dispatch<React.SetStateAction<T>>];
}
