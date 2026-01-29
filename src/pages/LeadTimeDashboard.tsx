import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardFilters } from '@/components/dashboard/DashboardFilters';
import { useFilters } from '@/contexts/FilterContext';
import { supabase } from '@/integrations/supabase/client';
import { Clock, BarChart3, Timer } from 'lucide-react';
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
  Cell,
  ReferenceLine,
  ComposedChart,
  Area,
} from 'recharts';

interface SystemLeadTimeData {
  system: string;
  avgLeadTime: number;
}

interface MonthlyLeadTimeData {
  month: string;
  monthLabel: string;
  avgLeadTime: number;
  medianLeadTime: number;
}

interface DistributionData {
  range: string;
  count: number;
  rangeStart: number;
}

interface KPIData {
  avgLeadTime: number;
  medianLeadTime: number;
  p90LeadTime: number;
}

const chartConfig = {
  avgLeadTime: {
    label: 'Lead Time Médio',
    color: 'hsl(var(--primary))',
  },
  medianLeadTime: {
    label: 'Lead Time Mediano',
    color: 'hsl(var(--accent))',
  },
  count: {
    label: 'Quantidade',
    color: 'hsl(var(--primary))',
  },
};

// Helper function to calculate percentile
function percentile(arr: number[], p: number): number {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (index - lower) * (sorted[upper] - sorted[lower]);
}

// Helper function to calculate median
function median(arr: number[]): number {
  return percentile(arr, 50);
}

export default function LeadTimeDashboard() {
  const { filters } = useFilters();
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KPIData>({
    avgLeadTime: 0,
    medianLeadTime: 0,
    p90LeadTime: 0,
  });
  const [systemData, setSystemData] = useState<SystemLeadTimeData[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyLeadTimeData[]>([]);
  const [distributionData, setDistributionData] = useState<DistributionData[]>([]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      let query = supabase
        .from('issues')
        .select('resolved_date, system, lead_time_days, created_date')
        .not('lead_time_days', 'is', null)
        .gt('lead_time_days', 0);

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
        setKpis({ avgLeadTime: 0, medianLeadTime: 0, p90LeadTime: 0 });
        setSystemData([]);
        setMonthlyData([]);
        setDistributionData([]);
        setLoading(false);
        return;
      }

      // Extract lead times
      const leadTimes = issues
        .map(i => i.lead_time_days)
        .filter((lt): lt is number => lt !== null && lt > 0);

      if (leadTimes.length === 0) {
        setKpis({ avgLeadTime: 0, medianLeadTime: 0, p90LeadTime: 0 });
        setSystemData([]);
        setMonthlyData([]);
        setDistributionData([]);
        setLoading(false);
        return;
      }

      // Calculate KPIs
      const avgLeadTime = Math.round(leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length);
      const medianLeadTime = Math.round(median(leadTimes));
      const p90LeadTime = Math.round(percentile(leadTimes, 90));

      setKpis({ avgLeadTime, medianLeadTime, p90LeadTime });

      // Lead time by system
      const systemMap = new Map<string, number[]>();
      issues.forEach(issue => {
        if (issue.lead_time_days && issue.lead_time_days > 0) {
          const system = issue.system || 'Não definido';
          if (!systemMap.has(system)) {
            systemMap.set(system, []);
          }
          systemMap.get(system)!.push(issue.lead_time_days);
        }
      });

      const systemChartData: SystemLeadTimeData[] = Array.from(systemMap.entries())
        .map(([system, times]) => ({
          system,
          avgLeadTime: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
        }))
        .sort((a, b) => a.avgLeadTime - b.avgLeadTime);
      setSystemData(systemChartData);

      // Monthly trend - use resolved_date (delivery date)
      const monthlyMap = new Map<string, number[]>();
      issues.forEach(issue => {
        if (issue.resolved_date && issue.lead_time_days && issue.lead_time_days > 0) {
          const monthKey = format(parseISO(issue.resolved_date), 'yyyy-MM');
          if (!monthlyMap.has(monthKey)) {
            monthlyMap.set(monthKey, []);
          }
          monthlyMap.get(monthKey)!.push(issue.lead_time_days);
        }
      });

      const sortedMonths = Array.from(monthlyMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]));

      const monthlyChartData: MonthlyLeadTimeData[] = sortedMonths.map(([month, times]) => ({
        month,
        monthLabel: format(parseISO(`${month}-01`), 'MMM yy', { locale: ptBR }),
        avgLeadTime: Math.round(times.reduce((a, b) => a + b, 0) / times.length),
        medianLeadTime: Math.round(median(times)),
      }));
      setMonthlyData(monthlyChartData);

      // Distribution histogram
      const maxLeadTime = Math.max(...leadTimes);
      const bucketSize = maxLeadTime <= 30 ? 5 : maxLeadTime <= 60 ? 10 : 15;
      const buckets = new Map<number, number>();

      leadTimes.forEach(lt => {
        const bucket = Math.floor(lt / bucketSize) * bucketSize;
        buckets.set(bucket, (buckets.get(bucket) || 0) + 1);
      });

      const distributionChartData: DistributionData[] = Array.from(buckets.entries())
        .map(([start, count]) => ({
          range: `${start}-${start + bucketSize}`,
          rangeStart: start,
          count,
        }))
        .sort((a, b) => a.rangeStart - b.rangeStart);
      setDistributionData(distributionChartData);

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
        <h1 className="text-2xl font-bold text-foreground">Lead Time</h1>
        <p className="text-muted-foreground">
          Tempo médio entre criação e entrega das histórias
        </p>
      </div>

      {/* Filters */}
      <DashboardFilters />

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lead Time Médio
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {kpis.avgLeadTime} <span className="text-lg font-normal text-muted-foreground">dias</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">Tempo médio de entrega</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lead Time Mediano
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {kpis.medianLeadTime} <span className="text-lg font-normal text-muted-foreground">dias</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">50% das entregas abaixo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              P90 Lead Time
            </CardTitle>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {kpis.p90LeadTime} <span className="text-lg font-normal text-muted-foreground">dias</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">90% das entregas abaixo</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {kpis.avgLeadTime === 0 ? (
        <NoDataEmptyState />
      ) : (
        <>
          {/* Distribution Histogram */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold">Distribuição do Lead Time</CardTitle>
              <p className="text-sm text-muted-foreground">
                Frequência de entregas por faixa de dias
              </p>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <ComposedChart data={distributionData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="range" 
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    label={{ value: 'Dias', position: 'insideBottom', offset: -5, fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <YAxis 
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                    label={{ value: 'Quantidade', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))' }}
                  />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="count"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                    name="Entregas"
                  />
                  <ReferenceLine 
                    x={distributionData.find(d => d.rangeStart <= kpis.medianLeadTime && d.rangeStart + 5 > kpis.medianLeadTime)?.range}
                    stroke="hsl(var(--destructive))"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    label={{ value: 'Mediana', fill: 'hsl(var(--destructive))', fontSize: 10 }}
                  />
                </ComposedChart>
              </ChartContainer>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            {/* Lead Time by System */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Lead Time por Sistema</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Comparativo de eficiência entre áreas
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
                      label={{ value: 'Dias', position: 'insideBottom', offset: -5, fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <YAxis 
                      type="category" 
                      dataKey="system" 
                      width={70}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar
                      dataKey="avgLeadTime"
                      fill="hsl(var(--primary))"
                      radius={[0, 4, 4, 0]}
                      name="Lead Time Médio"
                    >
                      {systemData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`}
                          fill={entry.avgLeadTime > kpis.p90LeadTime 
                            ? 'hsl(var(--destructive))' 
                            : 'hsl(var(--primary))'
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Lead Time Trend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-semibold">Evolução do Lead Time</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Tendência da eficiência ao longo do tempo
                </p>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px] w-full">
                  <LineChart data={monthlyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="monthLabel" 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
                    />
                    <YAxis 
                      tick={{ fill: 'hsl(var(--muted-foreground))' }}
                      label={{ value: 'Dias', angle: -90, position: 'insideLeft', fill: 'hsl(var(--muted-foreground))' }}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="avgLeadTime"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                      name="Lead Time Médio"
                    />
                    <Line
                      type="monotone"
                      dataKey="medianLeadTime"
                      stroke="hsl(var(--muted-foreground))"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ fill: 'hsl(var(--muted-foreground))', strokeWidth: 2 }}
                      name="Lead Time Mediano"
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
