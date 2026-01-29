import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface FilterState {
  dateStart: Date | undefined;
  dateEnd: Date | undefined;
  system: string;
  version: string;
  issueType: string;
}

interface FilterContextType {
  filters: FilterState;
  setFilters: (filters: Partial<FilterState>) => void;
  clearFilters: () => void;
  hasActiveFilters: boolean;
}

const defaultFilters: FilterState = {
  dateStart: undefined,
  dateEnd: undefined,
  system: 'all',
  version: 'all',
  issueType: 'all',
};

const FilterContext = createContext<FilterContextType | null>(null);

export function FilterProvider({ children }: { children: ReactNode }) {
  const [filters, setFiltersState] = useState<FilterState>(defaultFilters);

  const setFilters = useCallback((newFilters: Partial<FilterState>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }));
  }, []);

  const clearFilters = useCallback(() => {
    setFiltersState(defaultFilters);
  }, []);

  const hasActiveFilters = 
    filters.dateStart !== undefined ||
    filters.dateEnd !== undefined ||
    filters.system !== 'all' ||
    filters.version !== 'all' ||
    filters.issueType !== 'all';

  return (
    <FilterContext.Provider value={{ filters, setFilters, clearFilters, hasActiveFilters }}>
      {children}
    </FilterContext.Provider>
  );
}

export function useFilters() {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return context;
}
