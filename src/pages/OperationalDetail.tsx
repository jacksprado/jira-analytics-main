import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { DashboardFilters } from '@/components/dashboard/DashboardFilters';
import { useFilters } from '@/contexts/FilterContext';
import { supabase } from '@/integrations/supabase/client';
import { Search, ChevronUp, ChevronDown, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TableSkeleton, FiltersSkeleton } from '@/components/dashboard/DashboardSkeletons';
import { NoDataEmptyState } from '@/components/dashboard/EmptyStates';

interface Issue {
  id: string;
  issue_key: string;
  summary: string | null;
  issue_type: string | null;
  status: string | null;
  system: string | null;
  fix_version: string | null;
  created_date: string | null;
  resolved_date: string | null;
  lead_time_days: number | null;
}

type SortField = 'issue_key' | 'summary' | 'issue_type' | 'system' | 'fix_version' | 'created_date' | 'resolved_date' | 'lead_time_days';
type SortDirection = 'asc' | 'desc';

const ITEMS_PER_PAGE = 20;

export default function OperationalDetail() {
  const { filters } = useFilters();
  const [loading, setLoading] = useState(true);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [avgLeadTime, setAvgLeadTime] = useState(0);
  const [p90LeadTime, setP90LeadTime] = useState(0);

  // Local filters
  const [searchTerm, setSearchTerm] = useState('');
  const [minLeadTime, setMinLeadTime] = useState('');
  const [maxLeadTime, setMaxLeadTime] = useState('');
  const [onlyBugs, setOnlyBugs] = useState(false);
  const [aboveAverage, setAboveAverage] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<SortField>('lead_time_days');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      let query = supabase
        .from('issues')
        .select('id, issue_key, summary, issue_type, status, system, fix_version, created_date, resolved_date, lead_time_days');

      // Apply global filters
      if (filters.dateStart) {
        query = query.gte('resolved_date', format(filters.dateStart, 'yyyy-MM-dd'));
      }
      if (filters.dateEnd) {
        query = query.lte('resolved_date', format(filters.dateEnd, 'yyyy-MM-dd'));
      }
      if (filters.system !== 'all') {
        query = query.eq('system', filters.system);
      }
      if (filters.version !== 'all') {
        query = query.eq('fix_version', filters.version);
      }
      if (filters.issueType !== 'all') {
        query = query.eq('issue_type', filters.issueType);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching issues:', error);
        setLoading(false);
        return;
      }

      setIssues(data || []);

      // Calculate average and P90 lead time
      const leadTimes = (data || [])
        .map(i => i.lead_time_days)
        .filter((lt): lt is number => lt !== null && lt > 0);

      if (leadTimes.length > 0) {
        const avg = leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length;
        setAvgLeadTime(Math.round(avg));

        const sorted = [...leadTimes].sort((a, b) => a - b);
        const p90Index = Math.floor(sorted.length * 0.9);
        setP90LeadTime(sorted[p90Index] || avg);
      }

      setLoading(false);
    }

    fetchData();
    setCurrentPage(1);
  }, [filters]);

  // Apply local filters and sorting
  const filteredAndSortedIssues = useMemo(() => {
    let result = [...issues];

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        issue =>
          issue.issue_key.toLowerCase().includes(term) ||
          (issue.summary && issue.summary.toLowerCase().includes(term))
      );
    }

    // Min lead time filter
    if (minLeadTime) {
      const min = parseInt(minLeadTime);
      if (!isNaN(min)) {
        result = result.filter(issue => issue.lead_time_days && issue.lead_time_days >= min);
      }
    }

    // Max lead time filter
    if (maxLeadTime) {
      const max = parseInt(maxLeadTime);
      if (!isNaN(max)) {
        result = result.filter(issue => issue.lead_time_days && issue.lead_time_days <= max);
      }
    }

    // Only bugs filter
    if (onlyBugs) {
      result = result.filter(issue => issue.issue_type === 'Bug');
    }

    // Above average filter
    if (aboveAverage && avgLeadTime > 0) {
      result = result.filter(issue => issue.lead_time_days && issue.lead_time_days > avgLeadTime);
    }

    // Sorting
    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (aVal === null || aVal === undefined) return sortDirection === 'asc' ? 1 : -1;
      if (bVal === null || bVal === undefined) return sortDirection === 'asc' ? -1 : 1;

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc'
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });

    return result;
  }, [issues, searchTerm, minLeadTime, maxLeadTime, onlyBugs, aboveAverage, avgLeadTime, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedIssues.length / ITEMS_PER_PAGE);
  const paginatedIssues = filteredAndSortedIssues.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-4 w-4 inline ml-1" />
    ) : (
      <ChevronDown className="h-4 w-4 inline ml-1" />
    );
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const clearLocalFilters = () => {
    setSearchTerm('');
    setMinLeadTime('');
    setMaxLeadTime('');
    setOnlyBugs(false);
    setAboveAverage(false);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <div className="h-8 w-64 bg-muted rounded animate-pulse mb-2" />
          <div className="h-4 w-96 bg-muted rounded animate-pulse" />
        </div>
        <FiltersSkeleton />
        <TableSkeleton rows={10} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Detalhamento</h1>
        <p className="text-muted-foreground">
          Investigação detalhada das histórias entregues
        </p>
      </div>

      {/* Global Filters */}
      <DashboardFilters />

      {/* Local Filters */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-medium">Filtros Locais</CardTitle>
            <Button variant="ghost" size="sm" onClick={clearLocalFilters}>
              Limpar filtros locais
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            {/* Search */}
            <div className="lg:col-span-2">
              <Label htmlFor="search" className="text-sm text-muted-foreground mb-1.5 block">
                Buscar
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Issue Key ou Summary..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Min Lead Time */}
            <div>
              <Label htmlFor="minLead" className="text-sm text-muted-foreground mb-1.5 block">
                Lead Time Mín.
              </Label>
              <Input
                id="minLead"
                type="number"
                placeholder="dias"
                value={minLeadTime}
                onChange={e => setMinLeadTime(e.target.value)}
              />
            </div>

            {/* Max Lead Time */}
            <div>
              <Label htmlFor="maxLead" className="text-sm text-muted-foreground mb-1.5 block">
                Lead Time Máx.
              </Label>
              <Input
                id="maxLead"
                type="number"
                placeholder="dias"
                value={maxLeadTime}
                onChange={e => setMaxLeadTime(e.target.value)}
              />
            </div>

            {/* Checkboxes */}
            <div className="flex flex-col gap-3 justify-center">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="onlyBugs"
                  checked={onlyBugs}
                  onCheckedChange={checked => setOnlyBugs(checked as boolean)}
                />
                <Label htmlFor="onlyBugs" className="text-sm cursor-pointer">
                  Apenas Bugs
                </Label>
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="aboveAvg"
                  checked={aboveAverage}
                  onCheckedChange={checked => setAboveAverage(checked as boolean)}
                />
                <Label htmlFor="aboveAvg" className="text-sm cursor-pointer">
                  Acima da média ({avgLeadTime}d)
                </Label>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <span>
          {filteredAndSortedIssues.length} {filteredAndSortedIssues.length === 1 ? 'resultado' : 'resultados'}
          {filteredAndSortedIssues.length !== issues.length && ` (de ${issues.length} total)`}
        </span>
        <span>
          Lead Time: Média {avgLeadTime}d | P90 {p90LeadTime}d
        </span>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort('issue_key')}
                  >
                    Issue Key
                    <SortIndicator field="issue_key" />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none min-w-[200px]"
                    onClick={() => handleSort('summary')}
                  >
                    Summary
                    <SortIndicator field="summary" />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort('issue_type')}
                  >
                    Tipo
                    <SortIndicator field="issue_type" />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort('system')}
                  >
                    Sistema
                    <SortIndicator field="system" />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort('fix_version')}
                  >
                    Versão
                    <SortIndicator field="fix_version" />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort('created_date')}
                  >
                    Criação
                    <SortIndicator field="created_date" />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none"
                    onClick={() => handleSort('resolved_date')}
                  >
                    Resolução
                    <SortIndicator field="resolved_date" />
                  </TableHead>
                  <TableHead
                    className="cursor-pointer select-none text-right"
                    onClick={() => handleSort('lead_time_days')}
                  >
                    Lead Time
                    <SortIndicator field="lead_time_days" />
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedIssues.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                      Nenhum resultado encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedIssues.map(issue => {
                    const isBug = issue.issue_type === 'Bug';
                    const isHighLeadTime = issue.lead_time_days && issue.lead_time_days > p90LeadTime;

                    return (
                      <TableRow
                        key={issue.id}
                        className={isBug ? 'bg-destructive/5' : ''}
                      >
                        <TableCell className="font-mono text-sm">
                          {issue.issue_key}
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate" title={issue.summary || ''}>
                          {issue.summary || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={isBug ? 'destructive' : 'secondary'}
                            className="font-normal"
                          >
                            {issue.issue_type || '-'}
                          </Badge>
                        </TableCell>
                        <TableCell>{issue.system || '-'}</TableCell>
                        <TableCell>{issue.fix_version || '-'}</TableCell>
                        <TableCell>{formatDate(issue.created_date)}</TableCell>
                        <TableCell>{formatDate(issue.resolved_date)}</TableCell>
                        <TableCell className="text-right">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span
                                className={`inline-flex items-center gap-1 ${
                                  isHighLeadTime ? 'text-destructive font-medium' : ''
                                }`}
                              >
                                {issue.lead_time_days ?? '-'}
                                {issue.lead_time_days && (
                                  <span className="text-muted-foreground text-xs">d</span>
                                )}
                                {isHighLeadTime && (
                                  <AlertTriangle className="h-3 w-3 text-destructive" />
                                )}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="text-xs">
                                Lead Time: tempo entre criação e resolução
                                {isHighLeadTime && (
                                  <span className="block text-destructive mt-1">
                                    Acima do P90 ({p90LeadTime} dias)
                                  </span>
                                )}
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {currentPage} de {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
            >
              Próxima
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
