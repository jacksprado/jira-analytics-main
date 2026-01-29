import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon, X, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useFilters } from '@/contexts/FilterContext';
import { supabase } from '@/integrations/supabase/client';

interface FilterOptions {
  systems: string[];
  versions: string[];
  issueTypes: string[];
}

export function DashboardFilters() {
  const { filters, setFilters, clearFilters, hasActiveFilters } = useFilters();
  const [options, setOptions] = useState<FilterOptions>({
    systems: [],
    versions: [],
    issueTypes: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFilterOptions() {
      try {
        const { data: issues, error } = await supabase
          .from('issues')
          .select('system, fix_version, issue_type');

        if (error) throw error;

        if (issues) {
          const systems = [...new Set(issues.map(i => i.system).filter(Boolean))] as string[];
          const versions = [...new Set(issues.map(i => i.fix_version).filter(Boolean))] as string[];
          const issueTypes = [...new Set(issues.map(i => i.issue_type).filter(Boolean))] as string[];

          setOptions({
            systems: systems.sort(),
            versions: versions.sort(),
            issueTypes: issueTypes.sort(),
          });
        }
      } catch (error) {
        console.error('Error fetching filter options:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchFilterOptions();
  }, []);

  return (
    <div className={cn(
      "flex flex-wrap items-center gap-3 p-4 bg-card border rounded-lg transition-all duration-200",
      hasActiveFilters && "ring-2 ring-primary/20 border-primary/30"
    )}>
      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Filter className={cn("h-4 w-4", hasActiveFilters && "text-primary")} />
        <span>{hasActiveFilters ? 'Filtros ativos' : 'Filtros'}</span>
      </div>

      {/* Date Range - Start */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-[160px] justify-start text-left font-normal transition-colors",
              !filters.dateStart && "text-muted-foreground",
              filters.dateStart && "border-primary/50 bg-primary/5"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {filters.dateStart ? (
              format(new Date(filters.dateStart), "dd/MM/yyyy", { locale: ptBR })
            ) : (
              <span>Data inicial</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 z-50 bg-popover" align="start">
          <Calendar
            mode="single"
            selected={filters.dateStart}
            onSelect={(date) => setFilters({ dateStart: date })}
            initialFocus
            locale={ptBR}
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>

      {/* Date Range - End */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-[160px] justify-start text-left font-normal transition-colors",
              !filters.dateEnd && "text-muted-foreground",
              filters.dateEnd && "border-primary/50 bg-primary/5"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {filters.dateEnd ? (
              format(new Date(filters.dateEnd), "dd/MM/yyyy", { locale: ptBR })
            ) : (
              <span>Data final</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 z-50 bg-popover" align="start">
          <Calendar
            mode="single"
            selected={filters.dateEnd}
            onSelect={(date) => setFilters({ dateEnd: date })}
            initialFocus
            locale={ptBR}
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>

      {/* System Select */}
      <Select
        value={filters.system}
        onValueChange={(value) => setFilters({ system: value })}
      >
        <SelectTrigger className={cn(
          "w-[160px] transition-colors",
          filters.system !== 'all' && "border-primary/50 bg-primary/5"
        )}>
          <SelectValue placeholder="Sistema" />
        </SelectTrigger>
        <SelectContent className="z-50 bg-popover">
          <SelectItem value="all">Todos os sistemas</SelectItem>
          {options.systems.map((system) => (
            <SelectItem key={system} value={system}>
              {system}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Version Select */}
      <Select
        value={filters.version}
        onValueChange={(value) => setFilters({ version: value })}
      >
        <SelectTrigger className={cn(
          "w-[160px] transition-colors",
          filters.version !== 'all' && "border-primary/50 bg-primary/5"
        )}>
          <SelectValue placeholder="Versão" />
        </SelectTrigger>
        <SelectContent className="z-50 bg-popover max-h-[300px]">
          <SelectItem value="all">Todas as versões</SelectItem>
          {options.versions.map((version) => (
            <SelectItem key={version} value={version}>
              {version}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Issue Type Select */}
      <Select
        value={filters.issueType}
        onValueChange={(value) => setFilters({ issueType: value })}
      >
        <SelectTrigger className={cn(
          "w-[140px] transition-colors",
          filters.issueType !== 'all' && "border-primary/50 bg-primary/5"
        )}>
          <SelectValue placeholder="Tipo" />
        </SelectTrigger>
        <SelectContent className="z-50 bg-popover">
          <SelectItem value="all">Todos os tipos</SelectItem>
          {options.issueTypes.map((type) => (
            <SelectItem key={type} value={type}>
              {type}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Clear Filters Button */}
      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4 mr-1" />
          Limpar
        </Button>
      )}
    </div>
  );
}
