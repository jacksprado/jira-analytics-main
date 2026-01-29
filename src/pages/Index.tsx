import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell } from 'recharts';
import { FileSpreadsheet, Layers, Calculator, Calendar, TrendingUp, Clock, BarChart3, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DashboardFilters } from '@/components/dashboard/DashboardFilters';
import { useFilters } from '@/contexts/FilterContext';
import { DashboardSkeleton, KPICardSkeleton, ChartSkeleton } from '@/components/dashboard/DashboardSkeletons';
import { NoDataEmptyState } from '@/components/dashboard/EmptyStates';

interface KPIData {
  totalDelivered: number;
  totalBugs: number;
  bugPercentage: number;
  totalVersions: number;
  avgPerVersion: number;
  periodStart: string | null;
  periodEnd: string | null;
}

interface MonthlyData {
  month: string;
  count: number;
}

interface SystemData {
  system: string;
  count: number;
}

interface TypeData {
  type: string;
  count: number;
}

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export default function Index() {
  const { filters } = useFilters();
  const [kpis, setKpis] = useState<KPIData>({
    totalDelivered: 0,
    totalBugs: 0,
    bugPercentage: 0,
    totalVersions: 0,
    avgPerVersion: 0,
    periodStart: null,
    periodEnd: null,
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [systemData, setSystemData] = useState<SystemData[]>([]);
  const [typeData, setTypeData] = useState<TypeData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      try {
        // Build query with filters
        let query = supabase
          .from('issues')
          .select('*');

        // Apply date filters
        if (filters.dateStart) {
          query = query.gte('resolved_date', format(filters.dateStart, 'yyyy-MM-dd'));
        }
        if (filters.dateEnd) {
          query = query.lte('resolved_date', format(filters.dateEnd, 'yyyy-MM-dd'));
        }

        // Apply system filter
        if (filters.system !== 'all') {
          query = query.eq('system', filters.system);
        }

        // Apply version filter
        if (filters.version !== 'all') {
          query = query.eq('fix_version', filters.version);
        }

        // Apply issue type filter
        if (filters.issueType !== 'all') {
          query = query.eq('issue_type', filters.issueType);
        }

        const { data: issues, error } = await query;

        if (error) throw error;

        if (!issues || issues.length === 0) {
          setKpis({
            totalDelivered: 0,
            totalBugs: 0,
            bugPercentage: 0,
            totalVersions: 0,
            avgPerVersion: 0,
            periodStart: null,
            periodEnd: null,
          });
          setMonthlyData([]);
          setSystemData([]);
          setTypeData([]);
          setLoading(false);
          return;
        }

        // Calculate KPIs
        const totalDelivered = issues.length;
        
        const totalBugs = issues.filter(i => i.issue_type?.toLowerCase() === 'bug').length;
        const bugPercentage = totalDelivered > 0 
          ? Math.round((totalBugs / totalDelivered) * 100)
          : 0;
        
        const uniqueVersions = new Set(
          issues.map(i => i.fix_version).filter(Boolean)
        );
        const totalVersions = uniqueVersions.size;
        
        const avgPerVersion = totalVersions > 0 
          ? Math.round((totalDelivered / totalVersions) * 10) / 10 
          : 0;

        // Use resolved_date for delivery period calculation
        const resolvedDates = issues
          .map(i => i.resolved_date)
          .filter(Boolean)
          .sort() as string[];
        
        const periodStart = resolvedDates[0] || null;
        const periodEnd = resolvedDates[resolvedDates.length - 1] || null;

        setKpis({
          totalDelivered,
          totalBugs,
          bugPercentage,
          totalVersions,
          avgPerVersion,
          periodStart,
          periodEnd,
        });

        // Calculate monthly data using resolved_date (delivery date)
        const monthlyMap = new Map<string, number>();
        issues.forEach(issue => {
          if (issue.resolved_date) {
            const monthKey = issue.resolved_date.substring(0, 7);
            monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + 1);
          }
        });
        
        const sortedMonthly = Array.from(monthlyMap.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([month, count]) => ({
            month: format(parseISO(`${month}-01`), 'MMM/yy', { locale: ptBR }),
            count,
          }));
        setMonthlyData(sortedMonthly);

        // Calculate system data
        const systemMap = new Map<string, number>();
        issues.forEach(issue => {
          const system = issue.system || 'Não definido';
          systemMap.set(system, (systemMap.get(system) || 0) + 1);
        });
        
        const sortedSystems = Array.from(systemMap.entries())
          .sort(([, a], [, b]) => b - a)
          .map(([system, count]) => ({ system, count }));
        setSystemData(sortedSystems);

        // Calculate type data
        const typeMap = new Map<string, number>();
        issues.forEach(issue => {
          const type = issue.issue_type || 'Não definido';
          typeMap.set(type, (typeMap.get(type) || 0) + 1);
        });
        
        const sortedTypes = Array.from(typeMap.entries())
          .sort(([, a], [, b]) => b - a)
          .map(([type, count]) => ({ type, count }));
        setTypeData(sortedTypes);

      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, [filters]);

  const formatPeriod = () => {
    if (!kpis.periodStart || !kpis.periodEnd) return '—';
    const start = format(parseISO(kpis.periodStart), 'dd/MM/yyyy', { locale: ptBR });
    const end = format(parseISO(kpis.periodEnd), 'dd/MM/yyyy', { locale: ptBR });
    return `${start} - ${end}`;
  };

  const hasData = kpis.totalDelivered > 0;

  const stats = [
    {
      title: 'Histórias Entregues',
      value: hasData ? kpis.totalDelivered.toLocaleString('pt-BR') : '—',
      description: hasData ? 'Issues com data de resolução' : 'Aguardando importação',
      icon: FileSpreadsheet,
    },
    {
      title: 'Bugs Identificados',
      value: hasData ? kpis.totalBugs.toLocaleString('pt-BR') : '—',
      description: hasData ? `${kpis.bugPercentage}% das entregas` : 'Aguardando importação',
      icon: AlertCircle,
    },
    {
      title: 'Versões Distintas',
      value: hasData ? kpis.totalVersions.toLocaleString('pt-BR') : '—',
      description: hasData ? 'Fix versions únicas' : 'Aguardando importação',
      icon: Layers,
    },
    {
      title: 'Média por Versão',
      value: hasData ? kpis.avgPerVersion.toLocaleString('pt-BR') : '—',
      description: hasData ? 'Histórias por versão' : 'Aguardando dados',
      icon: Calculator,
    },
    {
      title: 'Período Analisado',
      value: hasData ? '' : '—',
      customValue: hasData ? formatPeriod() : undefined,
      description: hasData ? 'Intervalo de entregas' : 'Nenhuma importação',
      icon: Calendar,
    },
  ];

  const monthlyChartConfig = {
    count: {
      label: 'Entregas',
      color: 'hsl(var(--primary))',
    },
  };

  const systemChartConfig = {
    count: {
      label: 'Histórias',
      color: 'hsl(var(--primary))',
    },
  };

  const typeChartConfig = typeData.reduce((acc, item, index) => {
    acc[item.type] = {
      label: item.type,
      color: CHART_COLORS[index % CHART_COLORS.length],
    };
    return acc;
  }, {} as Record<string, { label: string; color: string }>);

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard Executivo</h1>
        <p className="text-muted-foreground">
          Visão geral das entregas realizadas no período selecionado
        </p>
      </div>

      {/* Filters */}
      <DashboardFilters />

      {/* KPI Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((stat) => (
          <Card key={stat.title} className="executive-card-elevated">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-5 w-5 text-muted-foreground/50" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stat.customValue || stat.value}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Section */}
      {hasData ? (
        <>
          {/* Monthly Deliveries Chart */}
          <Card className="executive-card-elevated">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Entregas por Mês
              </CardTitle>
              <CardDescription>
                Quantidade de histórias resolvidas por mês
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={monthlyChartConfig} className="h-72 w-full">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <XAxis 
                    dataKey="month" 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fontSize: 12 }}
                  />
                  <YAxis 
                    tickLine={false} 
                    axisLine={false}
                    tick={{ fontSize: 12 }}
                    width={40}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar 
                    dataKey="count" 
                    fill="hsl(var(--primary))" 
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Two Column Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* System Distribution */}
            <Card className="executive-card-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Histórias por Sistema
                </CardTitle>
                <CardDescription>
                  Distribuição de entregas por sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={systemChartConfig} className="h-64 w-full">
                  <BarChart 
                    data={systemData} 
                    layout="vertical"
                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                  >
                    <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                    <YAxis 
                      type="category" 
                      dataKey="system" 
                      tickLine={false} 
                      axisLine={false}
                      tick={{ fontSize: 12 }}
                      width={100}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar 
                      dataKey="count" 
                      fill="hsl(var(--primary))" 
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Type Distribution */}
            <Card className="executive-card-elevated">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Distribuição por Tipo
                </CardTitle>
                <CardDescription>
                  Quantidade de histórias por tipo de issue
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={typeChartConfig} className="h-64 w-full">
                  <PieChart>
                    <ChartTooltip content={<ChartTooltipContent nameKey="type" />} />
                    <Pie
                      data={typeData}
                      dataKey="count"
                      nameKey="type"
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={2}
                    >
                      {typeData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={CHART_COLORS[index % CHART_COLORS.length]}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                {/* Legend */}
                <div className="flex flex-wrap justify-center gap-4 mt-4">
                  {typeData.map((item, index) => (
                    <div key={item.type} className="flex items-center gap-2">
                      <div 
                        className="h-3 w-3 rounded-sm" 
                        style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                      />
                      <span className="text-sm text-muted-foreground">
                        {item.type} ({item.count})
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        <NoDataEmptyState />
      )}
    </div>
  );
}
