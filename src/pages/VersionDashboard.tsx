import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ScatterChart, Scatter, ZAxis, Cell } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Layers, FileSpreadsheet, BarChart3, Clock, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DashboardFilters } from '@/components/dashboard/DashboardFilters';
import { useFilters } from '@/contexts/FilterContext';
import { cn } from '@/lib/utils';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeletons';
import { NoDataEmptyState } from '@/components/dashboard/EmptyStates';

interface VersionData {
  version: string;
  system: string;
  totalStories: number;
  totalBugs: number;
  bugPercentage: number;
  firstResolved: string | null;
  lastResolved: string | null;
  durationDays: number;
  description: string | null;
}

interface KPIData {
  totalVersions: number;
  totalStories: number;
  avgDurationDays: number;
}

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

type SortField = 'version' | 'system' | 'durationDays';
type SortDirection = 'asc' | 'desc';

export default function VersionDashboard() {
  const { filters } = useFilters();
  const [versions, setVersions] = useState<VersionData[]>([]);
  const [kpis, setKpis] = useState<KPIData>({ totalVersions: 0, totalStories: 0, avgDurationDays: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('totalStories');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  useEffect(() => {
    async function fetchVersionData() {
      setLoading(true);
      try {
        // Fetch versions with descriptions
        const { data: versionsData } = await supabase
          .from('versions')
          .select('name, description');

        const versionsMap = new Map(
          (versionsData || []).map(v => [v.name, v.description])
        );

        let query = supabase
          .from('issues')
          .select('*')
          .not('fix_version', 'is', null);

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

        const { data: issues, error } = await query;

        if (error) throw error;

        if (!issues || issues.length === 0) {
          setVersions([]);
          setKpis({ totalVersions: 0, totalStories: 0, avgDurationDays: 0 });
          setLoading(false);
          return;
        }

        // Group by version
        const versionMap = new Map<string, {
          system: string;
          stories: number;
          bugs: number;
          dates: string[];
        }>();

        issues.forEach(issue => {
          const version = issue.fix_version!;
          const existing = versionMap.get(version) || {
            system: issue.system || 'Não definido',
            stories: 0,
            bugs: 0,
            dates: [],
          };

          existing.stories++;
          if (issue.issue_type?.toLowerCase() === 'bug') {
            existing.bugs++;
          }
          if (issue.resolved_date) {
            existing.dates.push(issue.resolved_date);
          }

          versionMap.set(version, existing);
        });

        // Calculate version metrics
        const versionData: VersionData[] = Array.from(versionMap.entries()).map(([version, data]) => {
          const sortedDates = data.dates.sort();
          const firstResolved = sortedDates[0] || null;
          const lastResolved = sortedDates[sortedDates.length - 1] || null;
          
          let durationDays = 0;
          if (firstResolved && lastResolved) {
            durationDays = differenceInDays(parseISO(lastResolved), parseISO(firstResolved)) + 1;
          }

          return {
            version,
            system: data.system,
            totalStories: data.stories,
            totalBugs: data.bugs,
            bugPercentage: data.stories > 0 ? Math.round((data.bugs / data.stories) * 100) : 0,
            firstResolved,
            lastResolved,
            durationDays,
            description: versionsMap.get(version) || null,
          };
        });

        setVersions(versionData);

        // Calculate KPIs
        const totalVersions = versionData.length;
        const totalStories = versionData.reduce((sum, v) => sum + v.totalStories, 0);
        const avgDurationDays = totalVersions > 0 
          ? Math.round((versionData.reduce((sum, v) => sum + v.durationDays, 0) / totalVersions) * 10) / 10 
          : 0;

        setKpis({ totalVersions, totalStories, avgDurationDays });

      } catch (error) {
        console.error('Error fetching version data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchVersionData();
  }, [filters]);

  // Sorted versions for table
  const sortedVersions = useMemo(() => {
    return [...versions].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortDirection === 'asc' 
          ? aValue.localeCompare(bValue) 
          : bValue.localeCompare(aValue);
      }
      
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }
      
      return 0;
    });
  }, [versions, sortField, sortDirection]);

  // Chart data
  const barChartData = useMemo(() => {
    return [...versions]
      .sort((a, b) => b.totalStories - a.totalStories)
      .slice(0, 15)
      .map(v => ({
        version: v.version.length > 20 ? v.version.substring(0, 20) + '...' : v.version,
        fullVersion: v.version,
        count: v.totalStories,
        description: v.description,
      }));
  }, [versions]);

  const scatterData = useMemo(() => {
    return versions.map(v => ({
      version: v.version,
      description: v.description,
      duration: v.durationDays,
      stories: v.totalStories,
      z: v.totalStories,
    }));
  }, [versions]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '—';
    return format(parseISO(dateStr), 'dd/MM/yyyy', { locale: ptBR });
  };

  const hasData = versions.length > 0;

  const stats = [
    {
      title: 'Total de Versões',
      value: hasData ? kpis.totalVersions.toLocaleString('pt-BR') : '—',
      description: hasData ? 'Versões no filtro atual' : 'Aguardando dados',
      icon: Layers,
    },
    {
      title: 'Total de Histórias',
      value: hasData ? kpis.totalStories.toLocaleString('pt-BR') : '—',
      description: hasData ? 'Issues resolvidas' : 'Aguardando dados',
      icon: FileSpreadsheet,
    },
    {
      title: 'Tempo Médio de Entrega',
      value: hasData ? `${kpis.avgDurationDays.toLocaleString('pt-BR')} dias` : '—',
      description: hasData ? 'Por versão' : 'Aguardando dados',
      icon: Clock,
    },
  ];

  const barChartConfig = {
    count: {
      label: 'Histórias',
      color: 'hsl(var(--primary))',
    },
  };

  const scatterChartConfig = {
    stories: {
      label: 'Histórias',
      color: 'hsl(var(--primary))',
    },
  };

  const SortableHeader = ({ field, children }: { field: SortField; children: React.ReactNode }) => (
    <TableHead 
      className="cursor-pointer hover:bg-muted/50 transition-colors"
      onClick={() => handleSort(field)}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortField === field && (
          <span className="text-xs">{sortDirection === 'asc' ? '↑' : '↓'}</span>
        )}
      </div>
    </TableHead>
  );

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Entregas por Versão</h1>
        <p className="text-muted-foreground">
          Análise de volume, duração e composição por release
        </p>
      </div>

      {/* Filters */}
      <DashboardFilters />

      {/* KPI Cards */}
      <div className="grid gap-6 sm:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.title} className="executive-card-elevated">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-5 w-5 text-muted-foreground/50" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {hasData ? (
        <>
          {/* Versions Table */}
          <Card className="executive-card-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                Tabela de Versões
              </CardTitle>
              <CardDescription>
                Detalhamento por versão — clique nos cabeçalhos para ordenar
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableHeader field="version">Versão</SortableHeader>
                      <SortableHeader field="system">Sistema</SortableHeader>
                      <TableHead>Descrição</TableHead>
                      <SortableHeader field="durationDays">Duração (dias)</SortableHeader>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedVersions.map((version) => (
                      <TableRow 
                        key={version.version}
                        className={cn(
                          "cursor-pointer transition-colors",
                          selectedVersion === version.version && "bg-primary/10"
                        )}
                        onClick={() => setSelectedVersion(
                          selectedVersion === version.version ? null : version.version
                        )}
                      >
                        <TableCell className="font-medium max-w-[200px] truncate">
                          {version.version}
                        </TableCell>
                        <TableCell>{version.system}</TableCell>
                        <TableCell className="max-w-[300px] truncate text-sm text-muted-foreground">
                          {version.description || '—'}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {version.durationDays}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Stories by Version */}
            <Card className="executive-card-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Histórias por Versão
                </CardTitle>
                <CardDescription>
                  Top 15 versões por volume de entregas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={barChartConfig} className="h-80 w-full">
                  <BarChart 
                    data={barChartData} 
                    layout="vertical"
                    margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                  >
                    <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                    <YAxis 
                      type="category" 
                      dataKey="version" 
                      tickLine={false} 
                      axisLine={false}
                      tick={{ fontSize: 10 }}
                      width={120}
                    />
                    <ChartTooltip 
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="rounded-lg border bg-background px-3 py-2 shadow-xl">
                              <p className="font-medium text-sm">{data.fullVersion}</p>
                              {data.description && (
                                <p className="text-xs text-muted-foreground mb-1">{data.description}</p>
                              )}
                              <p className="text-xs text-muted-foreground">
                                Histórias: {data.count}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar 
                      dataKey="count" 
                      radius={[0, 4, 4, 0]}
                    >
                      {barChartData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`}
                          fill={selectedVersion === entry.fullVersion 
                            ? 'hsl(var(--chart-2))' 
                            : 'hsl(var(--primary))'
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Duration vs Volume */}
            <Card className="executive-card-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Duração vs Volume
                </CardTitle>
                <CardDescription>
                  Relação entre duração da versão e quantidade entregue
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={scatterChartConfig} className="h-80 w-full">
                  <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                    <XAxis 
                      type="number" 
                      dataKey="duration" 
                      name="Duração" 
                      unit=" dias"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11 }}
                    />
                    <YAxis 
                      type="number" 
                      dataKey="stories" 
                      name="Histórias"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11 }}
                    />
                    <ZAxis type="number" dataKey="z" range={[50, 400]} />
                    <ChartTooltip 
                      cursor={{ strokeDasharray: '3 3' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="rounded-lg border bg-background px-3 py-2 shadow-xl">
                              <p className="font-medium text-sm">{data.version}</p>
                              {data.description && (
                                <p className="text-xs text-muted-foreground mb-1">{data.description}</p>
                              )}
                              <p className="text-xs text-muted-foreground">
                                Duração: {data.duration} dias
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Histórias: {data.stories}
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Scatter 
                      data={scatterData}
                    >
                      {scatterData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`}
                          fill={selectedVersion === entry.version 
                            ? 'hsl(var(--chart-2))' 
                            : 'hsl(var(--primary))'
                          }
                        />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <Card className="executive-card-elevated">
          <CardContent className="py-12">
            <div className="text-center">
              <Layers className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-1">
                Nenhuma versão encontrada
              </p>
              <p className="text-xs text-muted-foreground">
                Ajuste os filtros ou importe dados do Jira
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
