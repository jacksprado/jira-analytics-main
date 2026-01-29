import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileSpreadsheet, CheckCircle2, XCircle, Loader2, AlertTriangle, Layers } from 'lucide-react';
import { parseCSV, mapCSVToIssues, type ParsedIssue } from '@/lib/csv-parser';

interface ImportResult {
  totalRows: number;
  inserted: number;
  updated: number;
  errors: string[];
}

interface VersionImportResult {
  totalRows: number;
  inserted: number;
  updated: number;
  errors: string[];
}

interface ProgressState {
  current: number;
  total: number;
  percentage: number;
  currentItem?: string;
}

export default function Import() {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [versionFile, setVersionFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isProcessingVersions, setIsProcessingVersions] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [versionResult, setVersionResult] = useState<VersionImportResult | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [versionDragActive, setVersionDragActive] = useState(false);
  const [progress, setProgress] = useState<ProgressState>({ current: 0, total: 0, percentage: 0 });
  const [versionProgress, setVersionProgress] = useState<ProgressState>({ current: 0, total: 0, percentage: 0 });

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleVersionDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setVersionDragActive(true);
    } else if (e.type === "dragleave") {
      setVersionDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'text/csv' || droppedFile.name.endsWith('.csv')) {
        setFile(droppedFile);
        setResult(null);
      } else {
        toast({
          title: 'Arquivo inválido',
          description: 'Por favor, selecione um arquivo CSV.',
          variant: 'destructive',
        });
      }
    }
  }, [toast]);

  const handleVersionDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setVersionDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type === 'text/csv' || droppedFile.name.endsWith('.csv')) {
        setVersionFile(droppedFile);
        setVersionResult(null);
      } else {
        toast({
          title: 'Arquivo inválido',
          description: 'Por favor, selecione um arquivo CSV.',
          variant: 'destructive',
        });
      }
    }
  }, [toast]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setResult(null);
    }
  };

  const handleVersionFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setVersionFile(e.target.files[0]);
      setVersionResult(null);
    }
  };

  const processImport = async () => {
    if (!file) return;

    setIsProcessing(true);
    setResult(null);
    setProgress({ current: 0, total: 0, percentage: 0 });

    try {
      // Parse CSV
      const text = await file.text();
      const rows = parseCSV(text);

      if (rows.length === 0) {
        toast({
          title: 'CSV vazio',
          description: 'O arquivo CSV não contém dados para importar.',
          variant: 'destructive',
        });
        setIsProcessing(false);
        return;
      }

      // Map to issues
      const { issues, errors } = mapCSVToIssues(rows);

      if (issues.length === 0) {
        toast({
          title: 'Erro no CSV',
          description: 'Nenhuma issue válida encontrada. Verifique se o CSV contém a coluna "Issue Key".',
          variant: 'destructive',
        });
        setIsProcessing(false);
        return;
      }

      // Get existing issue keys
      const issueKeys = issues.map(i => i.issue_key);
      const { data: existingIssues } = await supabase
        .from('issues')
        .select('issue_key')
        .in('issue_key', issueKeys);

      const existingKeys = new Set(existingIssues?.map(i => i.issue_key) || []);

      let inserted = 0;
      let updated = 0;

      // Initialize progress
      setProgress({ current: 0, total: issues.length, percentage: 0 });

      // Small delay to ensure progress bar renders
      await new Promise(resolve => setTimeout(resolve, 100));

      // Process each issue
      for (let index = 0; index < issues.length; index++) {
        const issue = issues[index];
        
        // Update progress with current item
        setProgress({ 
          current: index, 
          total: issues.length, 
          percentage: Math.round((index / issues.length) * 100),
          currentItem: issue.issue_key
        });
        
        if (existingKeys.has(issue.issue_key)) {
          // Update
          const { error } = await supabase
            .from('issues')
            .update({
              summary: issue.summary,
              issue_type: issue.issue_type,
              status: issue.status,
              project: issue.project,
              system: issue.system,
              fix_version: issue.fix_version,
              created_date: issue.created_date,
              resolved_date: issue.resolved_date,
              lead_time_days: issue.lead_time_days,
              original_estimate: issue.original_estimate,
              time_spent: issue.time_spent,
              parent_key: issue.parent_key,
              imported_at: new Date().toISOString(),
            })
            .eq('issue_key', issue.issue_key);

          if (!error) updated++;
          else errors.push(`Erro ao atualizar ${issue.issue_key}: ${error.message}`);
        } else {
          // Insert
          const { error } = await supabase
            .from('issues')
            .insert({
              issue_key: issue.issue_key,
              summary: issue.summary,
              issue_type: issue.issue_type,
              status: issue.status,
              project: issue.project,
              system: issue.system,
              fix_version: issue.fix_version,
              created_date: issue.created_date,
              resolved_date: issue.resolved_date,
              lead_time_days: issue.lead_time_days,
              original_estimate: issue.original_estimate,
              time_spent: issue.time_spent,
              parent_key: issue.parent_key,
            });

          if (!error) inserted++;
          else errors.push(`Erro ao inserir ${issue.issue_key}: ${error.message}`);
        }

        // Update progress
        const newCurrent = index + 1;
        const newPercentage = Math.round((newCurrent / issues.length) * 100);
        setProgress({ current: newCurrent, total: issues.length, percentage: newPercentage });

        // Small delay to allow progress updates to be visible
        if (index % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      // Create import record
      await supabase
        .from('imports')
        .insert({
          filename: file.name,
          total_rows: issues.length,
          user_id: null,
        });

      const importResult: ImportResult = {
        totalRows: issues.length,
        inserted,
        updated,
        errors,
      };

      setResult(importResult);

      if (errors.length === 0) {
        toast({
          title: 'Importação concluída!',
          description: `${inserted} inseridos, ${updated} atualizados.`,
        });
      } else {
        toast({
          title: 'Importação parcial',
          description: `Processado com ${errors.length} erro(s).`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Import error:', error);
      toast({
        title: 'Erro na importação',
        description: 'Ocorreu um erro ao processar o arquivo.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
      setProgress({ current: 0, total: 0, percentage: 0 });
    }
  };

  const resetImport = () => {
    setFile(null);
    setResult(null);
  };

  const processVersionImport = async () => {
    if (!versionFile) return;

    setIsProcessingVersions(true);
    setVersionResult(null);
    setVersionProgress({ current: 0, total: 0, percentage: 0 });

    try {
      // Parse CSV
      const text = await versionFile.text();
      const rows = parseCSV(text);

      if (rows.length === 0) {
        toast({
          title: 'CSV vazio',
          description: 'O arquivo CSV não contém dados para importar.',
          variant: 'destructive',
        });
        setIsProcessingVersions(false);
        return;
      }

      // Validate CSV format for versions (RELEASE, DESCRIÇÃO)
      if (!rows[0].RELEASE || !rows[0].DESCRIÇÃO) {
        toast({
          title: 'Formato inválido',
          description: 'O CSV deve conter as colunas: RELEASE e DESCRIÇÃO',
          variant: 'destructive',
        });
        setIsProcessingVersions(false);
        return;
      }

      const errors: string[] = [];
      let inserted = 0;
      let updated = 0;

      // Initialize progress
      setVersionProgress({ current: 0, total: rows.length, percentage: 0 });

      // Small delay to ensure progress bar renders
      await new Promise(resolve => setTimeout(resolve, 100));

      for (let index = 0; index < rows.length; index++) {
        const row = rows[index];
        const releaseName = row.RELEASE?.trim();
        const description = row.DESCRIÇÃO?.trim();

        if (!releaseName) {
          errors.push('Linha com RELEASE vazio');
          continue;
        }

        // Update progress with current item
        setVersionProgress({ 
          current: index, 
          total: rows.length, 
          percentage: Math.round((index / rows.length) * 100),
          currentItem: releaseName
        });

        // Get existing version
        const { data: existing } = await supabase
          .from('versions')
          .select('id')
          .eq('name', releaseName)
          .single();

        if (existing) {
          // Update
          const { error } = await supabase
            .from('versions')
            .update({
              description: description || null,
            })
            .eq('id', existing.id);

          if (!error) updated++;
          else errors.push(`Erro ao atualizar ${releaseName}: ${error.message}`);
        } else {
          // Insert
          const { error } = await supabase
            .from('versions')
            .insert({
              name: releaseName,
              description: description || null,
            });

          if (!error) inserted++;
          else errors.push(`Erro ao inserir ${releaseName}: ${error.message}`);
        }

        // Update progress
        const newCurrent = index + 1;
        const newPercentage = Math.round((newCurrent / rows.length) * 100);
        setVersionProgress({ current: newCurrent, total: rows.length, percentage: newPercentage });

        // Small delay to allow progress updates to be visible
        if (index % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      const importResult: VersionImportResult = {
        totalRows: rows.length,
        inserted,
        updated,
        errors,
      };

      setVersionResult(importResult);

      if (errors.length === 0) {
        toast({
          title: 'Importação de versões concluída!',
          description: `${inserted} inseridas, ${updated} atualizadas.`,
        });
      } else {
        toast({
          title: 'Importação de versões parcial',
          description: `Processado com ${errors.length} erro(s).`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Version import error:', error);
      toast({
        title: 'Erro na importação',
        description: 'Ocorreu um erro ao processar o arquivo de versões.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessingVersions(false);
      setVersionProgress({ current: 0, total: 0, percentage: 0 });
    }
  };

  const resetVersionImport = () => {
    setVersionFile(null);
    setVersionResult(null);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Importar Dados</h1>
        <p className="text-muted-foreground mt-1">
          Importe dados do Jira: Issues ou Informações de Versões
        </p>
      </div>

      <div className="grid gap-8">
        {/* ===== ISSUES IMPORT SECTION ===== */}
        <div className="space-y-4 pb-8 border-b">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">Importar Issues do Jira</h2>
          </div>
          <p className="text-muted-foreground">
            Importe historicamente de Issues, Histórias, Bugs e outras informações do Jira
          </p>

          {/* Upload Card */}
          <Card className="executive-card-elevated">
            <CardHeader>
              <CardTitle>Upload de Arquivo CSV (Issues)</CardTitle>
              <CardDescription>
                Selecione um arquivo CSV exportado do Jira. Issues existentes serão atualizadas automaticamente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Dropzone */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`
                  relative border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
                  ${dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
                  ${file ? 'bg-muted/30' : ''}
                `}
              >
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isProcessing}
                />
                
                {file ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileSpreadsheet className="h-10 w-10 text-primary" />
                    <p className="font-medium text-foreground">{file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-10 w-10 text-muted-foreground/50" />
                    <p className="font-medium text-foreground">
                      Arraste um arquivo CSV ou clique para selecionar
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Suporta arquivos CSV exportados do Jira com dados de Issues
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <div className="flex gap-3">
                  <Button
                    onClick={processImport}
                    disabled={!file || isProcessing}
                    className="flex-1"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Importar Issues
                      </>
                    )}
                  </Button>
                  {file && !isProcessing && (
                    <Button variant="outline" onClick={resetImport}>
                      Limpar
                    </Button>
                  )}
                </div>

                {/* Progress Bar */}
                {isProcessing && progress.total > 0 && (
                  <div className="space-y-3 pt-4 border-t mt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        Processando Issues
                      </span>
                      <span className="text-sm text-muted-foreground font-medium">
                        {progress.current} de {progress.total} ({progress.percentage}%)
                      </span>
                    </div>
                    <Progress value={progress.percentage} className="h-3" />
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        Importando dados do Jira...
                      </p>
                      {progress.currentItem && (
                        <p className="text-xs font-mono bg-muted/50 px-2 py-1 rounded border border-primary/20">
                          <span className="text-primary">→</span> {progress.currentItem}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Result Card */}
          {result && (
            <Card className={`executive-card-elevated ${result.errors.length > 0 ? 'border-warning' : 'border-success'}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {result.errors.length === 0 ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-success" />
                      Importação de Issues Concluída
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-5 w-5 text-warning" />
                      Importação de Issues Parcial
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold text-foreground">{result.totalRows}</p>
                    <p className="text-sm text-muted-foreground">Total Processado</p>
                  </div>
                  <div className="text-center p-4 bg-success/10 rounded-lg">
                    <p className="text-2xl font-bold text-success">{result.inserted}</p>
                    <p className="text-sm text-muted-foreground">Inseridos</p>
                  </div>
                  <div className="text-center p-4 bg-primary/10 rounded-lg">
                    <p className="text-2xl font-bold text-primary">{result.updated}</p>
                    <p className="text-sm text-muted-foreground">Atualizados</p>
                  </div>
                </div>

                {result.errors.length > 0 && (
                  <div className="mt-4 p-3 bg-destructive/10 rounded-lg">
                    <p className="text-sm font-medium text-destructive mb-2 flex items-center gap-2">
                      <XCircle className="h-4 w-4" />
                      {result.errors.length} erro(s) encontrado(s):
                    </p>
                    <ul className="text-xs text-destructive/80 space-y-1 max-h-32 overflow-y-auto">
                      {result.errors.slice(0, 10).map((err, i) => (
                        <li key={i}>• {err}</li>
                      ))}
                      {result.errors.length > 10 && (
                        <li className="font-medium">... e mais {result.errors.length - 10} erro(s)</li>
                      )}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          <Card className="executive-card">
            <CardHeader>
              <CardTitle className="text-base">Colunas Esperadas do CSV (Issues do Jira)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                <div className="p-2 bg-primary/10 rounded font-medium">Chave da item *</div>
                <div className="p-2 bg-muted/50 rounded">Tipo de item</div>
                <div className="p-2 bg-muted/50 rounded">Resumo</div>
                <div className="p-2 bg-muted/50 rounded">Status</div>
                <div className="p-2 bg-muted/50 rounded">Criado</div>
                <div className="p-2 bg-muted/50 rounded">Resolvido</div>
                <div className="p-2 bg-muted/50 rounded">Versões corrigidas</div>
                <div className="p-2 bg-muted/50 rounded">Campo personalizado (Núcleo)</div>
                <div className="p-2 bg-muted/50 rounded">Σ da Estimativa Original</div>
                <div className="p-2 bg-muted/50 rounded">Σ de Tempo Gasto</div>
                <div className="p-2 bg-muted/50 rounded">Chave pai</div>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                * Campo obrigatório. O Lead Time é calculado automaticamente a partir das datas de criação e resolução.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* ===== VERSIONS IMPORT SECTION ===== */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Layers className="h-6 w-6 text-chart-2" />
            <h2 className="text-2xl font-bold">Importar Descrições de Versões</h2>
          </div>
          <p className="text-muted-foreground">
            Importe as descrições e informações das versões para melhorar o dashboard de entregas
          </p>

          {/* Upload Card */}
          <Card className="executive-card-elevated border-chart-2/20">
            <CardHeader>
              <CardTitle>Upload de Arquivo CSV (Versões)</CardTitle>
              <CardDescription>
                Selecione um arquivo CSV com as releases e suas descrições. Versões existentes serão atualizadas automaticamente.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Dropzone */}
              <div
                onDragEnter={handleVersionDrag}
                onDragLeave={handleVersionDrag}
                onDragOver={handleVersionDrag}
                onDrop={handleVersionDrop}
                className={`
                  relative border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer
                  ${versionDragActive ? 'border-chart-2 bg-chart-2/5' : 'border-muted-foreground/25 hover:border-chart-2/50'}
                  ${versionFile ? 'bg-muted/30' : ''}
                `}
              >
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleVersionFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isProcessingVersions}
                />
                
                {versionFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <Layers className="h-10 w-10 text-chart-2" />
                    <p className="font-medium text-foreground">{versionFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(versionFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-10 w-10 text-muted-foreground/50" />
                    <p className="font-medium text-foreground">
                      Arraste um arquivo CSV ou clique para selecionar
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Suporta arquivos CSV com colunas: RELEASE e DESCRIÇÃO
                    </p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="space-y-3">
                <div className="flex gap-3">
                  <Button
                    onClick={processVersionImport}
                    disabled={!versionFile || isProcessingVersions}
                    className="flex-1"
                    variant="outline"
                  >
                    {isProcessingVersions ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processando...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Importar Versões
                      </>
                    )}
                  </Button>
                  {versionFile && !isProcessingVersions && (
                    <Button variant="ghost" onClick={resetVersionImport}>
                      Limpar
                    </Button>
                  )}
                </div>

                {/* Progress Bar */}
                {isProcessingVersions && versionProgress.total > 0 && (
                  <div className="space-y-3 pt-4 border-t mt-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-chart-2" />
                        Processando Versões
                      </span>
                      <span className="text-sm text-muted-foreground font-medium">
                        {versionProgress.current} de {versionProgress.total} ({versionProgress.percentage}%)
                      </span>
                    </div>
                    <Progress value={versionProgress.percentage} className="h-3" />
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">
                        Importando informações de versões...
                      </p>
                      {versionProgress.currentItem && (
                        <p className="text-xs font-mono bg-muted/50 px-2 py-1 rounded border border-chart-2/20">
                          <span className="text-chart-2">→</span> {versionProgress.currentItem}
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Result Card */}
          {versionResult && (
            <Card className={`executive-card-elevated ${versionResult.errors.length > 0 ? 'border-warning' : 'border-success'}`}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {versionResult.errors.length === 0 ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 text-success" />
                      Importação de Versões Concluída
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-5 w-5 text-warning" />
                      Importação de Versões Parcial
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-2xl font-bold text-foreground">{versionResult.totalRows}</p>
                    <p className="text-sm text-muted-foreground">Total Processado</p>
                  </div>
                  <div className="text-center p-4 bg-success/10 rounded-lg">
                    <p className="text-2xl font-bold text-success">{versionResult.inserted}</p>
                    <p className="text-sm text-muted-foreground">Inseridas</p>
                  </div>
                  <div className="text-center p-4 bg-primary/10 rounded-lg">
                    <p className="text-2xl font-bold text-primary">{versionResult.updated}</p>
                    <p className="text-sm text-muted-foreground">Atualizadas</p>
                  </div>
                </div>

                {versionResult.errors.length > 0 && (
                  <div className="mt-4 p-3 bg-destructive/10 rounded-lg">
                    <p className="text-sm font-medium text-destructive mb-2 flex items-center gap-2">
                      <XCircle className="h-4 w-4" />
                      {versionResult.errors.length} erro(s) encontrado(s):
                    </p>
                    <ul className="text-xs text-destructive/80 space-y-1 max-h-32 overflow-y-auto">
                      {versionResult.errors.slice(0, 10).map((err, i) => (
                        <li key={i}>• {err}</li>
                      ))}
                      {versionResult.errors.length > 10 && (
                        <li className="font-medium">... e mais {versionResult.errors.length - 10} erro(s)</li>
                      )}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Instructions */}
          <Card className="executive-card border-chart-2/20">
            <CardHeader>
              <CardTitle className="text-base">Formato do CSV (Versões)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="font-medium text-sm mb-2">Colunas Necessárias:</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 bg-primary/10 rounded font-medium text-sm">RELEASE *</div>
                    <div className="p-2 bg-muted/50 rounded text-sm">DESCRIÇÃO</div>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Exemplo:</p>
                  <pre className="bg-muted/50 p-2 rounded text-xs overflow-x-auto">
{`RELEASE,DESCRIÇÃO
Évora 2.15.0,Melhoria no processo de Cancelamento e Refaturamento
Fábrica 2.2.0,Fábrica de Aplicações → Refinar Organização`}
                  </pre>
                </div>
                <p className="text-xs text-muted-foreground">
                  * Campo obrigatório. Use exatamente o mesmo nome da release do Jira.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
