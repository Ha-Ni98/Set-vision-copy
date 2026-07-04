import { useEffect, useState } from "react";

// Debounces a value before it becomes a query param, so search input doesn't refetch on
// every keystroke (plan.md §B8).
export function useDebouncedValue<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
