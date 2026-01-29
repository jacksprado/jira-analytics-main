import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardFilters } from '@/components/dashboard/DashboardFilters';
import { useFilters } from '@/contexts/FilterContext';
import { supabase } from '@/integrations/supabase/client';
import { TrendingUp, Calendar, BarChart3, Award } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DashboardSkeleton } from '@/components/dashboard/DashboardSkeletons';
import { NoDataEmptyState } from '@/components/dashboard/EmptyStates';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart,
  Legend,
} from 'recharts';

interface MonthlyData {
  month: string;
  monthLabel: string;
  count: number;
}

interface SystemData {
  system: string;
  count: number;
}

interface TypeMonthlyData {
  month: string;
  monthLabel: string;
  [key: string]: string | number;
}

interface KPIData {
  totalDelivered: number;
  monthlyAverage: number;
  peakMonth: string;
  peakMonthCount: number;
}

const chartConfig = {
  count: {
    label: 'Histórias',
    color: 'hsl(var(--primary))',
  },
  Story: {
    label: 'Story',
    color: 'hsl(var(--primary))',
  },
  Bug: {
    label: 'Bug',
    color: 'hsl(var(--destructive))',
  },
  Melhoria: {
    label: 'Melhoria',
    color: 'hsl(var(--accent))',
  },
  Task: {
    label: 'Task',
    color: 'hsl(var(--muted-foreground))',
  },
};

export default function ProductivityDashboard() {
  const { filters } = useFilters();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KPIData>({
    totalDelivered: 0,
    monthlyAverage: 0,
    peakMonth: '-',
    peakMonthCount: 0,
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [systemData, setSystemData] = useState<SystemData[]>([]);
  const [typeMonthlyData, setTypeMonthlyData] = useState<TypeMonthlyData[]>([]);
  const [issueTypes, setIssueTypes] = useState<string[]>([]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      let query = supabase
        .from('issues')
        .select('resolved_date, system, issue_type, created_date, status');

      // Apply filters
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

      if (error) {
        console.error('Error fetching issues:', error);
        setLoading(false);
        return;
      }

      if (!issues || issues.length === 0) {
        setKpis({ totalDelivered: 0, monthlyAverage: 0, peakMonth: '-', peakMonthCount: 0 });
        setMonthlyData([]);
        setSystemData([]);
        setTypeMonthlyData([]);
        setIssueTypes([]);
        setLoading(false);
        return;
      }

      // Calculate monthly throughput
      const monthlyMap = new Map<string, number>();
      const systemMap = new Map<string, number>();
      const typeMonthlyMap = new Map<string, Map<string, number>>();
      const uniqueTypes = new Set<string>();

      issues.forEach((issue) => {
        // Use resolved_date (delivery date) for monthly aggregation
        if (issue.resolved_date) {
          const monthKey = format(parseISO(issue.resolved_date), 'yyyy-MM');
          monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + 1);

          // System data
          const system = issue.system || 'Não definido';
          systemMap.set(system, (systemMap.get(system) || 0) + 1);

          // Type by month
          const issueType = issue.issue_type || 'Outros';
          uniqueTypes.add(issueType);
          
          if (!typeMonthlyMap.has(monthKey)) {
            typeMonthlyMap.set(monthKey, new Map());
          }
          const typeMap = typeMonthlyMap.get(monthKey)!;
          typeMap.set(issueType, (typeMap.get(issueType) || 0) + 1);
        }
      });

      // Sort months
      const sortedMonths = Array.from(monthlyMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]));

      // Find peak month
      let peakMonth = '-';
      let peakCount = 0;
      sortedMonths.forEach(([month, count]) => {
        if (count > peakCount) {
          peakCount = count;
          peakMonth = month;
        }
      });

      // Calculate KPIs
      const totalDelivered = issues.length;
      const numMonths = sortedMonths.length || 1;
      const monthlyAverage = Math.round(totalDelivered / numMonths);

      setKpis({
        totalDelivered,
        monthlyAverage,
        peakMonth: peakMonth !== '-' 
          ? format(parseISO(`${peakMonth}-01`), 'MMM yyyy', { locale: ptBR })
          : '-',
        peakMonthCount: peakCount,
      });

      // Prepare monthly data for chart
      const monthlyChartData: MonthlyData[] = sortedMonths.map(([month, count]) => ({
        month,
        monthLabel: format(parseISO(`${month}-01`), 'MMM yy', { locale: ptBR }),
        count,
      }));
      setMonthlyData(monthlyChartData);

      // Prepare system data for chart
      const systemChartData: SystemData[] = Array.from(systemMap.entries())
        .map(([system, count]) => ({ system, count }))
        .sort((a, b) => b.count - a.count);
      setSystemData(systemChartData);

      // Prepare type by month data
      const types = Array.from(uniqueTypes);
      setIssueTypes(types);

      const typeMonthlyChartData: TypeMonthlyData[] = sortedMonths.map(([month]) => {
        const typeMap = typeMonthlyMap.get(month) || new Map();
        const dataPoint: TypeMonthlyData = {
          month,
          monthLabel: format(parseISO(`${month}-01`), 'MMM yy', { locale: ptBR }),
        };
        types.forEach((type) => {
          dataPoint[type] = typeMap.get(type) || 0;
        });
        return dataPoint;
      });
      setTypeMonthlyData(typeMonthlyChartData);

      setLoading(false);
    }

    fetchData();
  }, [filters]);

  const typeColors = [
    'hsl(var(--primary))',
    'hsl(var(--destructive))',
    'hsl(var(--accent))',
    'hsl(142 76% 36%)',
    'hsl(38 92% 50%)',
    'hsl(280 65% 60%)',
  ];

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Produtividade</h1>
        <p className="text-muted-foreground">
          Ritmo de entrega ao longo do tempo, sem foco individual
        </p>
      </div>

      {/* Filters */}
      <DashboardFilters />

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Histórias Entregues
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{kpis.totalDelivered}</div>
            <p className="text-xs text-muted-foreground mt-1">No período selecionado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Média Mensal
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{kpis.monthlyAverage}</div>
            <p className="text-xs text-muted-foreground mt-1">Histórias por mês</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Mês com Maior Throughput
            </CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground capitalize">{kpis.peakMonth}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {kpis.peakMonthCount > 0 ? `${kpis.peakMonthCount} histórias` : '-'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {monthlyData.length === 0 ? (
        <NoDataEmptyState />
      ) : (
        <>
          {/* Monthly Throughput Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Throughput Mensal</CardTitle>
              <p className="text-sm text-muted-foreground">
                Evolução do volume de entregas ao longo do tempo
              </p>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <LineChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="monthLabel" 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    className="text-xs"
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                    name="Histórias"
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Throughput by System */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Throughput por Sistema</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Volume de entregas por área
                </p>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <BarChart
                    data={systemData}
                    layout="vertical"
                    margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      type="number"
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      type="category" 
                      dataKey="system" 
                      width={70}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="count"
                      fill="hsl(var(--primary))"
                      radius={[0, 4, 4, 0]}
                      name="Histórias"
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Throughput by Type over Time */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Throughput por Tipo</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Composição do trabalho ao longo do tempo
                </p>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <AreaChart
                    data={typeMonthlyData}
                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="monthLabel"
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    />
                    <YAxis 
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                    {issueTypes.map((type, index) => (
                      <Area
                        key={type}
                        type="monotone"
                        dataKey={type}
                        stackId="1"
                        stroke={typeColors[index % typeColors.length]}
                        fill={typeColors[index % typeColors.length]}
                        fillOpacity={0.6}
                        name={type}
                      />
                    ))}
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
