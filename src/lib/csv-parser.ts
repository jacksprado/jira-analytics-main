export interface ParsedIssue {
  issue_key: string;
  summary: string | null;
  issue_type: string | null;
  status: string | null;
  project: string | null;
  system: string | null;
  fix_version: string | null;
  created_date: string | null;
  resolved_date: string | null;
  lead_time_days: number | null;
  original_estimate: number | null;
  time_spent: number | null;
  parent_key: string | null;
}

interface CSVRow {
  [key: string]: string;
}

// Column name mappings (Jira exports can have different column names)
const COLUMN_MAPPINGS: Record<string, string[]> = {
  issue_key: ['Chave da item', 'Chave do item', 'Issue Key', 'Issue key', 'Key', 'key', 'Issue ID', 'issue_key'],
  summary: ['Resumo', 'Summary', 'summary', 'Título', 'Title', 'Description'],
  issue_type: ['Tipo de item', 'Tipo do item', 'Issue Type', 'Issue type', 'Type', 'type', 'issue_type', 'Tipo'],
  status: ['Status', 'status', 'Estado', 'State'],
  project: ['Project', 'project', 'Projeto', 'Project Key', 'Project key'],
  fix_version: ['Versões corrigidas', 'Fix Version', 'Fix version', 'Fix Version/s', 'Versão', 'Version', 'fix_version'],
  created_date: ['Criado', 'Created', 'created', 'Created Date', 'Data de Criação', 'created_date'],
  resolved_date: ['Resolvido', 'Resolved', 'resolved', 'Resolved Date', 'Resolution Date', 'Data de Resolução', 'resolved_date'],
  system: ['Campo personalizado (Núcleo)', 'Núcleo', 'System', 'system', 'Sistema', 'Component', 'Components'],
  original_estimate: ['Σ da Estimativa Original', 'Original Estimate', 'Estimativa Original', 'original_estimate'],
  time_spent: ['Σ de Tempo Gasto', 'Time Spent', 'Tempo Gasto', 'time_spent'],
  parent_key: ['Chave pai', 'Parent Key', 'parent_key'],
};

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

export function parseCSV(text: string): CSVRow[] {
  const lines = text.split(/\r?\n/).filter(line => line.trim());
  
  if (lines.length < 2) return [];
  
  const rawHeaders = parseCSVLine(lines[0]);
  
  // Handle duplicate headers by creating unique keys (e.g., "Versões corrigidas", "Versões corrigidas_2", etc.)
  const headerCounts: Record<string, number> = {};
  const headers = rawHeaders.map((header) => {
    const trimmedHeader = header.trim();
    if (headerCounts[trimmedHeader] === undefined) {
      headerCounts[trimmedHeader] = 1;
      return trimmedHeader;
    } else {
      headerCounts[trimmedHeader]++;
      return `${trimmedHeader}_${headerCounts[trimmedHeader]}`;
    }
  });
  
  const rows: CSVRow[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0 || (values.length === 1 && values[0] === '')) continue;
    
    const row: CSVRow = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    rows.push(row);
  }
  
  return rows;
}

// Find column value, checking all possible header variants including multiple columns with same name
function findColumn(row: CSVRow, columnKey: string): string | null {
  const possibleNames = COLUMN_MAPPINGS[columnKey] || [columnKey];
  
  for (const name of possibleNames) {
    // Check exact match first
    if (row[name] !== undefined && row[name] !== '') {
      return row[name];
    }
  }
  
  return null;
}

// Find all values for columns with repeating headers (like multiple "Versões corrigidas" or "Campo personalizado (Núcleo)")
// Headers are now unique: "Versões corrigidas", "Versões corrigidas_2", "Versões corrigidas_3", etc.
function findAllColumnsValues(row: CSVRow, columnKey: string): string[] {
  const possibleNames = COLUMN_MAPPINGS[columnKey] || [columnKey];
  const values: string[] = [];
  
  for (const key of Object.keys(row)) {
    for (const name of possibleNames) {
      // Match exact name or name with suffix (e.g., "Versões corrigidas" or "Versões corrigidas_2")
      if (key === name || key.match(new RegExp(`^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(_\\d+)?$`))) {
        if (row[key] && row[key].trim() !== '') {
          values.push(row[key].trim());
        }
      }
    }
  }
  
  // Remove duplicates
  return [...new Set(values)];
}

function parseDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  
  try {
    // Handle various date formats
    
    // Format: "dd/MM/yy HH:mm" (e.g., "17/12/25 10:11") - NUMERIC month with 2-digit year
    const numericShortFormat = /^(\d{1,2})\/(\d{1,2})\/(\d{2})\s+(\d{1,2}):(\d{2})$/;
    const numericShortMatch = dateStr.match(numericShortFormat);
    
    if (numericShortMatch) {
      const [, day, month, year, hours, minutes] = numericShortMatch;
      const fullYear = 2000 + parseInt(year);
      const date = new Date(fullYear, parseInt(month) - 1, parseInt(day), parseInt(hours), parseInt(minutes));
      
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
    
    // Format: "dd/MMM/yy HH:mm" (e.g., "15/Jan/24 10:30") - TEXT month
    const jiraFormat = /^(\d{1,2})\/([A-Za-z]{3})\/(\d{2,4})\s+(\d{1,2}):(\d{2})$/;
    const jiraMatch = dateStr.match(jiraFormat);
    
    if (jiraMatch) {
      const [, day, month, year, hours, minutes] = jiraMatch;
      const monthMap: Record<string, number> = {
        'Jan': 0, 'Fev': 1, 'Feb': 1, 'Mar': 2, 'Abr': 3, 'Apr': 3, 'Mai': 4, 'May': 4, 'Jun': 5,
        'Jul': 6, 'Ago': 7, 'Aug': 7, 'Set': 8, 'Sep': 8, 'Out': 9, 'Oct': 9, 'Nov': 10, 'Dez': 11, 'Dec': 11
      };
      const fullYear = year.length === 2 ? 2000 + parseInt(year) : parseInt(year);
      const date = new Date(fullYear, monthMap[month] || 0, parseInt(day), parseInt(hours), parseInt(minutes));
      
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
    
    // Format: "yyyy-MM-dd" or "yyyy-MM-ddTHH:mm:ss"
    const isoFormat = /^\d{4}-\d{2}-\d{2}/;
    if (isoFormat.test(dateStr)) {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
    
    // Format: "dd/MM/yyyy" (4-digit year)
    const slashFormat = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
    const slashMatch = dateStr.match(slashFormat);
    
    if (slashMatch) {
      const [, day, month, year] = slashMatch;
      // DD/MM/YYYY format (common in BR)
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
    
    // Fallback: try native parsing
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
    
    return null;
  } catch {
    return null;
  }
}

function calculateLeadTime(createdDate: string | null, resolvedDate: string | null): number | null {
  if (!createdDate || !resolvedDate) return null;
  
  try {
    const created = new Date(createdDate);
    const resolved = new Date(resolvedDate);
    
    if (isNaN(created.getTime()) || isNaN(resolved.getTime())) return null;
    
    const diffTime = resolved.getTime() - created.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays >= 0 ? diffDays : null;
  } catch {
    return null;
  }
}

// Parse time values like "1h 30m" or numeric hours
function parseTimeValue(value: string | null): number | null {
  if (!value || value.trim() === '') return null;
  
  const trimmed = value.trim();
  
  // If it's just a number, assume it's hours or seconds (Jira often exports in seconds)
  const numericOnly = parseFloat(trimmed);
  if (!isNaN(numericOnly)) {
    // If value is large (> 1000), it's probably seconds, convert to hours
    if (numericOnly > 1000) {
      return Math.round((numericOnly / 3600) * 100) / 100;
    }
    return numericOnly;
  }
  
  // Parse formats like "1h", "30m", "1h 30m", "2d 4h"
  let totalHours = 0;
  
  const dayMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*[dD]/);
  if (dayMatch) totalHours += parseFloat(dayMatch[1]) * 8; // Assume 8h work day
  
  const hourMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*[hH]/);
  if (hourMatch) totalHours += parseFloat(hourMatch[1]);
  
  const minMatch = trimmed.match(/(\d+(?:\.\d+)?)\s*[mM]/);
  if (minMatch) totalHours += parseFloat(minMatch[1]) / 60;
  
  return totalHours > 0 ? Math.round(totalHours * 100) / 100 : null;
}

// Normalize system names to handle variations
function normalizeSystemName(system: string | null): string | null {
  if (!system) return null;
  
  const normalized = system.trim();
  
  // Map variations to canonical names
  const systemMappings: Record<string, string> = {
    'Tesouraria Nacional': 'Tesouraria',
    'Rebaixa de Preços': 'Rebaixa de Preço',
    'Automação CD': 'Sorter',
  };
  
  return systemMappings[normalized] || normalized;
}

// Extract system from summary text between brackets, e.g. "[Tesouraria]" -> "Tesouraria"
function extractSystemFromSummary(summary: string | null): string | null {
  if (!summary) return null;
  
  const match = summary.match(/^\[([^\]]+)\]/);
  if (match) {
    return normalizeSystemName(match[1].trim());
  }
  return null;
}

// Extract version number for comparison (handles formats like "1.2.3", "v1.2", "Release 1.0")
function extractVersionNumber(version: string): number[] {
  const numbers = version.match(/(\d+)/g);
  if (!numbers) return [0];
  return numbers.map(n => parseInt(n, 10));
}

// Compare two versions, returns positive if a > b, negative if a < b, 0 if equal
function compareVersions(a: string, b: string): number {
  const numsA = extractVersionNumber(a);
  const numsB = extractVersionNumber(b);
  
  const maxLen = Math.max(numsA.length, numsB.length);
  for (let i = 0; i < maxLen; i++) {
    const numA = numsA[i] || 0;
    const numB = numsB[i] || 0;
    if (numA !== numB) return numA - numB;
  }
  return 0;
}

// Get the highest version from a list
function getHighestVersion(versions: string[]): string | null {
  if (versions.length === 0) return null;
  if (versions.length === 1) return versions[0];
  
  return versions.reduce((highest, current) => {
    return compareVersions(current, highest) > 0 ? current : highest;
  });
}

export function mapCSVToIssues(rows: CSVRow[]): { issues: ParsedIssue[]; errors: string[] } {
  const issues: ParsedIssue[] = [];
  const errors: string[] = [];
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const issueKey = findColumn(row, 'issue_key');
    
    if (!issueKey) {
      errors.push(`Linha ${i + 2}: Chave do item não encontrada`);
      continue;
    }
    
    const createdDateRaw = findColumn(row, 'created_date');
    const resolvedDateRaw = findColumn(row, 'resolved_date');
    
    const createdDate = parseDate(createdDateRaw);
    const resolvedDate = parseDate(resolvedDateRaw);
    
    if (createdDateRaw && !createdDate) {
      console.warn(`Linha ${i + 2}: Data de criação inválida: ${createdDateRaw}`);
    }
    
    if (resolvedDateRaw && !resolvedDate) {
      console.warn(`Linha ${i + 2}: Data de resolução inválida: ${resolvedDateRaw}`);
    }
    
    // Get all values for columns with multiple headers
    const fixVersions = findAllColumnsValues(row, 'fix_version');
    
    // Use only the highest version number when there are multiple versions
    const fixVersion = getHighestVersion(fixVersions.filter(v => v));
    
    // Extract summary first to get system from it
    const summary = findColumn(row, 'summary');
    
    // System is extracted from summary text between brackets [Sistema]
    const system = extractSystemFromSummary(summary);
    
    const issue: ParsedIssue = {
      issue_key: issueKey.trim(),
      summary: summary,
      issue_type: findColumn(row, 'issue_type'),
      status: findColumn(row, 'status'),
      project: findColumn(row, 'project'),
      system: system,
      fix_version: fixVersion,
      created_date: createdDate,
      resolved_date: resolvedDate,
      lead_time_days: calculateLeadTime(createdDate, resolvedDate),
      original_estimate: parseTimeValue(findColumn(row, 'original_estimate')),
      time_spent: parseTimeValue(findColumn(row, 'time_spent')),
      parent_key: findColumn(row, 'parent_key'),
    };
    
    issues.push(issue);
  }
  
  return { issues, errors };
}
