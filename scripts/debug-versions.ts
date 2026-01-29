import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugVersions() {
  console.log('🔍 Buscando todas as versões...\n');
  
  const { data: versions, error } = await supabase
    .from('versions')
    .select('name, description')
    .order('name');

  if (error) {
    console.error('Erro:', error);
    return;
  }

  console.log(`Total de versões: ${versions?.length || 0}\n`);

  const openVersions = versions?.filter(v => v.description !== null && v.description.trim() === '-') || [];
  const closedVersions = versions?.filter(v => !v.description || v.description.trim() !== '-') || [];

  console.log(`✅ Versões FECHADAS: ${closedVersions.length}`);
  console.log(`🔓 Versões EM ABERTO: ${openVersions.length}\n`);

  if (openVersions.length > 0) {
    console.log('📋 Versões em aberto:');
    openVersions.forEach((v, i) => {
      console.log(`  ${i + 1}. ${v.name}`);
      console.log(`     Descrição: "${v.description}"`);
      console.log(`     Comprimento: ${v.description?.length} caracteres`);
      console.log(`     Códigos dos caracteres: ${Array.from(v.description || '').map(c => c.charCodeAt(0)).join(', ')}`);
      console.log('');
    });
  }

  // Check for issues linked to open versions
  if (openVersions.length > 0) {
    const openVersionNames = openVersions.map(v => v.name);
    const { data: issues } = await supabase
      .from('issues')
      .select('id, issue_key, fix_version')
      .in('fix_version', openVersionNames);

    console.log(`\n📊 Issues vinculadas a versões em aberto: ${issues?.length || 0}`);
    
    if (issues && issues.length > 0) {
      const issuesByVersion = issues.reduce((acc: Record<string, number>, issue) => {
        const version = issue.fix_version || 'null';
        acc[version] = (acc[version] || 0) + 1;
        return acc;
      }, {});

      console.log('\nDistribuição por versão:');
      Object.entries(issuesByVersion).forEach(([version, count]) => {
        console.log(`  ${version}: ${count} issues`);
      });
    }
  }
}

debugVersions().catch(console.error);
