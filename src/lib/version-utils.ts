import { supabase } from '@/integrations/supabase/client';

export interface Issue {
  fix_version?: string | null;
  [key: string]: any;
}

/**
 * Busca e retorna a lista de versões que estão em aberto (sem descrição)
 * e filtra as issues para remover aquelas vinculadas a essas versões
 */
export async function getOpenVersionsAndFilterIssues<T extends Issue>(
  issues: T[]
): Promise<{ filteredIssues: T[]; openVersions: string[] }> {
  try {
    // Extrair versões únicas das issues
    const uniqueVersions = [
      ...new Set(issues.map(i => i.fix_version).filter(Boolean) as string[])
    ];

    if (uniqueVersions.length === 0) {
      return { filteredIssues: issues, openVersions: [] };
    }

    // Buscar descrições dessas versões
    const { data: versionsData } = await supabase
      .from('versions')
      .select('name, description')
      .in('name', uniqueVersions);

    // Criar mapa de descrições
    const versionsMap = new Map(
      (versionsData || []).map(v => [v.name, v.description])
    );

    // Identificar versões em aberto (sem descrição ou vazia)
    const openVersions = uniqueVersions.filter(versionName => {
      const description = versionsMap.get(versionName);
      return !description || description.trim() === '';
    });

    // Filtrar issues removendo as de versões em aberto
    const filteredIssues = issues.filter(
      issue => !issue.fix_version || !openVersions.includes(issue.fix_version)
    );

    console.log('🔒 Versões em aberto removidas dos cálculos:', {
      totalIssues: issues.length,
      issuesFiltradas: filteredIssues.length,
      issuesRemovidasDeVersõesAbertas: issues.length - filteredIssues.length,
      versõesEmAberto: openVersions.length
    });

    return { filteredIssues, openVersions };
  } catch (error) {
    console.error('Erro ao filtrar versões em aberto:', error);
    return { filteredIssues: issues, openVersions: [] };
  }
}
