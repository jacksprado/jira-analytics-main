import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardFilters } from '@/components/dashboard/DashboardFilters';
import { useFilters } from '@/contexts/FilterContext';
import { supabase } from '@/integrations/supabase/client';
import { Bug, Sparkles, Percent, AlertTriangle } from 'lucide-react';
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
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

interface MonthlyBugData {
  month: string;
  monthLabel: string;
  bugs: number;
}

interface SystemBugData {
  system: string;
  bugs: number;
}

interface DistributionData {
  name: string;
  value: number;
  color: string;
}

interface KPIData {
  totalBugs: number;
  totalFeatures: number;
  bugPercentage: number;
}

const chartConfig = {
  bugs: {
    label: 'Bugs',
    color: 'hsl(var(--destructive))',
  },
  features: {
    label: 'Features',
    color: 'hsl(var(--primary))',
  },
};

const COLORS = {
  bug: 'hsl(var(--destructive))',
  feature: 'hsl(var(--primary))',
};

export default function QualityDashboard() {
  const { filters } = useFilters();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KPIData>({
    totalBugs: 0,
    totalFeatures: 0,
    bugPercentage: 0,
  });
  const [distributionData, setDistributionData] = useState<DistributionData[]>([]);
  const [systemBugData, setSystemBugData] = useState<SystemBugData[]>([]);
  const [monthlyBugData, setMonthlyBugData] = useState<MonthlyBugData[]>([]);

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
        setKpis({ totalBugs: 0, totalFeatures: 0, bugPercentage: 0 });
        setDistributionData([]);
        setSystemBugData([]);
        setMonthlyBugData([]);
        setLoading(false);
        return;
      }

      // Calculate KPIs
      const bugs = issues.filter(i => i.issue_type === 'Bug');
      const features = issues.filter(i => i.issue_type !== 'Bug');
      const totalBugs = bugs.length;
      const totalFeatures = features.length;
      const bugPercentage = issues.length > 0 
        ? Math.round((totalBugs / issues.length) * 100) 
        : 0;

      setKpis({ totalBugs, totalFeatures, bugPercentage });

      // Distribution data for pie chart
      setDistributionData([
        { name: 'Bugs', value: totalBugs, color: COLORS.bug },
        { name: 'Features', value: totalFeatures, color: COLORS.feature },
      ]);

      // Bugs by system
      const systemMap = new Map<string, number>();
      bugs.forEach(bug => {
        const system = bug.system || 'Não definido';
        systemMap.set(system, (systemMap.get(system) || 0) + 1);
      });

      const systemChartData: SystemBugData[] = Array.from(systemMap.entries())
        .map(([system, bugCount]) => ({ system, bugs: bugCount }))
        .sort((a, b) => b.bugs - a.bugs);
      setSystemBugData(systemChartData);

      // Monthly bug trend - use resolved_date (delivery date)
      const monthlyMap = new Map<string, number>();
      bugs.forEach(bug => {
        if (bug.resolved_date) {
          const monthKey = format(parseISO(bug.resolved_date), 'yyyy-MM');
          monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + 1);
        }
      });

      const sortedMonths = Array.from(monthlyMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]));

      const monthlyChartData: MonthlyBugData[] = sortedMonths.map(([month, bugCount]) => ({
        month,
        monthLabel: format(parseISO(`${month}-01`), 'MMM yy', { locale: ptBR }),
        bugs: bugCount,
      }));
      setMonthlyBugData(monthlyChartData);

      setLoading(false);
    }

    fetchData();
  }, [filters]);

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Qualidade</h1>
        <p className="text-muted-foreground">
          Equilíbrio entre evolução e correção das entregas
        </p>
      </div>

      {/* Filters */}
      <DashboardFilters />

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Bugs
            </CardTitle>
            <Bug className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-destructive">{kpis.totalBugs}</div>
            <p className="text-xs text-muted-foreground mt-1">Correções entregues</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Features
            </CardTitle>
            <Sparkles className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">{kpis.totalFeatures}</div>
            <p className="text-xs text-muted-foreground mt-1">Evoluções entregues</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              % de Bugs
            </CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${kpis.bugPercentage > 30 ? 'text-destructive' : 'text-foreground'}`}>
              {kpis.bugPercentage}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">Do total de entregas</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {kpis.totalBugs === 0 && kpis.totalFeatures === 0 ? (
        <NoDataEmptyState />
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Distribution Pie Chart */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Distribuição Bugs vs Features</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Proporção entre correções e evoluções
                </p>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <PieChart>
                    <Pie
                      data={distributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      nameKey="name"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {distributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Legend />
                  </PieChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Bugs by System */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Bugs por Sistema</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Áreas com maior volume de correções
                </p>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <BarChart
                    data={systemBugData}
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
                      dataKey="bugs"
                      fill="hsl(var(--destructive))"
                      radius={[0, 4, 4, 0]}
                      name="Bugs"
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Bug Trend Over Time */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Tendência de Bugs</CardTitle>
              <p className="text-sm text-muted-foreground">
                Evolução do volume de bugs ao longo do tempo
              </p>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <LineChart data={monthlyBugData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
                    dataKey="bugs"
                    stroke="hsl(var(--destructive))"
                    strokeWidth={2}
                    dot={{ fill: 'hsl(var(--destructive))', strokeWidth: 2 }}
                    activeDot={{ r: 6 }}
                    name="Bugs"
                  />
                </LineChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
