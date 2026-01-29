-- SQL migration para adicionar as descrições das versões
-- Execute isso no Supabase SQL Editor ou via CLI

-- Adicionar constraint UNIQUE ao campo 'name' se não existir já
ALTER TABLE public.versions ADD CONSTRAINT versions_name_unique UNIQUE(name);

-- Inserir/atualizar as descrições das versões
INSERT INTO public.versions (name, description) VALUES
('Évora 2.15.0', 'Melhoria no processo de Cancelamento e Refaturamento'),
('Fábrica 2.2.0', 'Fábrica de Aplicações → Refinar Organização, Adicionar Filtros e Opção de Edição de Grupos'),
('Fábrica 2.2.1', 'Fábrica de Aplicacões → Editar URL independente do sistema'),
('Fábrica 2.2.2', 'Falha no Salvar Imagem no Cadastro de Grupo'),
('Fábrica 2.3.0', 'Ajustar o Fábrica de aplicações para buscar os ícones do novo bucket'),
('Gamper 2.5.0', 'Busca Dinâmica com Filtros por Funções e Colaboradores'),
('GP Conect 1.0.0', 'Higienizar a HOME do GP Conect'),
('GP Conect 2.0.0', 'Pequenas Correções e Melhorias no Fábrica de Aplicações'),
('GP Conect 2.6.0', 'Ajustar retorno de imagem_fundo no endpoint ListaAplicacao'),
('GP Conect 2.7.0', 'Inclusão e exposição do campo "Apelido" no Cadastro, Edição e Visualização de Lojas'),
('GP Conect 2.7.1', 'Prêmio - Ajustar validação de duplicar exceção no Pessoas e Beneficiarios referente à Lojas'),
('GP Conect 3.0.0', 'Prêmio | Divulgação → Implementação de Funcionalidade para Gestão de Mensagens'),
('GP Conect 3.1.0', 'Prêmio | Implementar verificação de nova versão e tratamento de acesso sem permissão nas aplicações'),
('Hierarquia 1.16.2', 'Correção definitiva da exibição do Gestor Anterior'),
('PagaCerto 1.7.0', 'Implementar bloqueio da URL para usuário sem permissão'),
('Permissionamento 9.4.0', 'Exibir Lojas já Permissionadas ao Editar'),
('Rebaixa 1.16.0', 'Bloqueio de URL para pessoas sem permissão'),
('Segurança 2.6.0', 'Ajustar vulnerabilidade de acesso direto'),
('Tesouraria 2.34.0', 'Cancelamento não recalcula'),
('TX Serviço 1.3.1', 'Correção para Redistribuição de Penalidades')
ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description;
