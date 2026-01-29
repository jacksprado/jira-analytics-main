// Script para importar as descrições das versões
// Executar com: bun scripts/import-version-descriptions.ts

const versionDescriptions = [
  { version: 'Évora 2.15.0', description: 'Melhoria no processo de Cancelamento e Refaturamento' },
  { version: 'Fábrica 2.2.0', description: 'Fábrica de Aplicações → Refinar Organização, Adicionar Filtros e Opção de Edição de Grupos' },
  { version: 'Fábrica 2.2.1', description: 'Fábrica de Aplicacões → Editar URL independente do sistema' },
  { version: 'Fábrica 2.2.2', description: 'Falha no Salvar Imagem no Cadastro de Grupo' },
  { version: 'Fábrica 2.3.0', description: 'Ajustar o Fábrica de aplicações para buscar os ícones do novo bucket' },
  { version: 'Gamper 2.5.0', description: 'Busca Dinâmica com Filtros por Funções e Colaboradores' },
  { version: 'GP Conect 1.0.0', description: 'Higienizar a HOME do GP Conect' },
  { version: 'GP Conect 2.0.0', description: 'Pequenas Correções e Melhorias no Fábrica de Aplicações' },
  { version: 'GP Conect 2.6.0', description: 'Ajustar retorno de imagem_fundo no endpoint ListaAplicacao' },
  { version: 'GP Conect 2.7.0', description: 'Inclusão e exposição do campo "Apelido" no Cadastro, Edição e Visualização de Lojas' },
  { version: 'GP Conect 2.7.1', description: 'Prêmio - Ajustar validação de duplicar exceção no Pessoas e Beneficiarios referente à Lojas' },
  { version: 'GP Conect 3.0.0', description: 'Prêmio | Divulgação → Implementação de Funcionalidade para Gestão de Mensagens' },
  { version: 'GP Conect 3.1.0', description: 'Prêmio | Implementar verificação de nova versão e tratamento de acesso sem permissão nas aplicações' },
  { version: 'Hierarquia 1.16.2', description: 'Correção definitiva da exibição do Gestor Anterior' },
  { version: 'PagaCerto 1.7.0', description: 'Implementar bloqueio da URL para usuário sem permissão' },
  { version: 'Permissionamento 9.4.0', description: 'Exibir Lojas já Permissionadas ao Editar' },
  { version: 'Rebaixa 1.16.0', description: 'Bloqueio de URL para pessoas sem permissão' },
  { version: 'Segurança 2.6.0', description: 'Ajustar vulnerabilidade de acesso direto' },
  { version: 'Tesouraria 2.34.0', description: 'Cancelamento não recalcula' },
  { version: 'TX Serviço 1.3.1', description: 'Correção para Redistribuição de Penalidades' },
];

// SQL para inserir as descrições (você pode executar isso diretamente no Supabase)
console.log('Execute as seguintes queries no Supabase SQL Editor:');
console.log('');

const sqlStatements = versionDescriptions.map(item => {
  const version = item.version.replace(/'/g, "''");
  const description = item.description.replace(/'/g, "''");
  return `UPDATE public.versions SET description = '${description}' WHERE name = '${version}';`;
});

sqlStatements.forEach(sql => console.log(sql));

console.log('');
console.log('Ou, execute este INSERT para adicionar novos registros se não existirem:');
console.log('');

const values = versionDescriptions.map(item => {
  const version = item.version.replace(/'/g, "''");
  const description = item.description.replace(/'/g, "''");
  return `('${version}', '${description}')`;
}).join(',\n');

console.log(`INSERT INTO public.versions (name, description) VALUES\n${values}\nON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;`);
