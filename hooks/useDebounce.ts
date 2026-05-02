import { useState, useEffect } from 'react';

// This hook delays updating a value until a specified amount of time has passed without that value changing.
// It's perfect for debouncing user input, like in a search field, to avoid excessive re-renders or API calls.
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set a timeout to update the debounced value after the specified delay.
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // The cleanup function clears the timeout if the value changes before the delay has passed.
    // This ensures that the debounced value is only updated after the user stops typing.
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]); // Only re-run the effect if value or delay changes.

  return debouncedValue;
}
