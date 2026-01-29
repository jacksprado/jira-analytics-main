import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileSpreadsheet, Filter, Calendar, AlertCircle } from 'lucide-react';
import { useFilters } from '@/contexts/FilterContext';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="py-12">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
            {icon || <AlertCircle className="h-6 w-6 text-muted-foreground" />}
          </div>
          <h3 className="text-lg font-medium text-foreground mb-2">{title}</h3>
          <p className="text-muted-foreground max-w-sm mx-auto mb-4">{description}</p>
          {action && (
            <Button variant="outline" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export function NoDataEmptyState() {
  const { hasActiveFilters, clearFilters } = useFilters();

  if (hasActiveFilters) {
    return (
      <EmptyState
        icon={<Filter className="h-6 w-6 text-muted-foreground" />}
        title="Nenhum resultado encontrado"
        description="Os filtros aplicados não retornaram dados. Tente ajustar o período ou remover alguns filtros."
        action={{
          label: 'Limpar filtros',
          onClick: clearFilters,
        }}
      />
    );
  }

  return (
    <EmptyState
      icon={<FileSpreadsheet className="h-6 w-6 text-muted-foreground" />}
      title="Nenhum dado disponível"
      description="Importe um arquivo CSV do Jira para começar a visualizar os dados nos dashboards."
    />
  );
}

export function NoDataForPeriodEmptyState() {
  const { clearFilters } = useFilters();

  return (
    <EmptyState
      icon={<Calendar className="h-6 w-6 text-muted-foreground" />}
      title="Sem entregas no período"
      description="Não há histórias entregues no período selecionado. Ajuste as datas ou remova o filtro de período."
      action={{
        label: 'Limpar filtros',
        onClick: clearFilters,
      }}
    />
  );
}
