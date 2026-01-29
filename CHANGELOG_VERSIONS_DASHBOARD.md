# Resumo das Alterações - Dashboard de Versões

## Modificações Realizadas

### 1. **Adição de Descrição das Versões**
   - Atualizado o `VersionDashboard.tsx` para buscar as descrições da tabela `versions`
   - A coluna `description` agora é exibida na tabela de versões
   - As descrições aparecem nos tooltips dos gráficos

### 2. **Remoção de Colunas**
   Removidas as seguintes colunas da tabela de versões:
   - Histórias
   - Bugs
   - % Bugs
   - Primeira Entrega
   - Última Entrega

### 3. **Alteração do KPI "Média por Versão"**
   - Substituído por **"Tempo Médio de Entrega"**
   - Agora calcula a média de dias de duração por versão
   - Exibe em formato: "X.X dias"
   - Ícone alterado de `Calculator` para `Clock`

### 4. **Melhorias nos Gráficos**
   - **Gráfico "Histórias por Versão"**: Tooltip agora exibe:
     - Nome da versão completo
     - Descrição da versão
     - Quantidade de histórias

   - **Gráfico "Duração vs Volume"**: Tooltip agora exibe:
     - Nome da versão
     - Descrição da versão
     - Duração em dias
     - Quantidade de histórias

### 5. **Tabela Simplificada**
   Nova estrutura da tabela:
   - Versão
   - Sistema
   - **Descrição** (coluna adicionada)
   - Duração (dias)

## Arquivos Modificados

### [src/pages/VersionDashboard.tsx](src/pages/VersionDashboard.tsx)
- Atualizado o tipo `VersionData` para incluir `description`
- Atualizado o tipo `KPIData` para `avgDurationDays` (substituindo `avgPerVersion`)
- Adicionada query para buscar descrições da tabela `versions`
- Simplificada a lógica de sort apenas para campos relevantes
- Atualizado o array `stats` com novo KPI
- Removidas colunas desnecessárias da tabela
- Adicionada coluna "Descrição"
- Customizados tooltips dos gráficos para incluir descrições

## Inserção de Dados

Um arquivo SQL foi criado em:
### [supabase/migrations/20250128_add_version_descriptions.sql](supabase/migrations/20250128_add_version_descriptions.sql)

Este arquivo contém:
- INSERT/UPDATE para adicionar as 20 versões com suas descrições
- Usa `ON CONFLICT` para atualizar registros existentes

**Para executar no Supabase:**
1. Acesse o Supabase Studio
2. Vá para SQL Editor
3. Cole e execute o conteúdo do arquivo `20250128_add_version_descriptions.sql`

## Próximos Passos (se necessário)

Se as descrições já existem no banco de dados e você só quer ver aparecerem:
1. A aplicação já está pronta para exibir as descrições
2. Basta que os dados estejam na coluna `description` da tabela `versions`

Se quiser adicionar mais versões com descrições no futuro:
1. Use o mesmo SQL template
2. Ou execute direto via Supabase Studio
