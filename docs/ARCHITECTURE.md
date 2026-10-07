# GYM MAINTENANCE — arquitetura base

## Objetivo

O núcleo foi desenhado como SaaS multiempresa desde o início. Cada registro operacional pertence a uma `company_id`; isso permite que uma futura conta atenda várias academias, condomínios ou studios sem misturar dados.

Esta fase é somente arquitetura. O app não conecta Supabase, não cria login real e não contém credenciais.

## Entidades

| Grupo | Entidades | Responsabilidade |
| --- | --- | --- |
| Organização | `companies`, `profiles`, `user_roles`, `company_members` | Empresas, usuários, catálogo de papéis e vínculo usuário–empresa |
| Operação | `clients`, `equipment` | Estabelecimentos atendidos e seus ativos |
| Atendimento | `service_requests`, `work_orders`, `work_order_equipment` | Chamados, execução e equipamentos envolvidos |
| Pessoas | `technician_profiles` | Especialidades e ativação dos técnicos |
| Materiais | `parts`, `work_order_parts` | Peças, estoque e consumo por OS |
| Evidências | `work_order_photos`, `work_order_signatures` | Fotos, assinatura e futura integração com Storage |
| Comercial | `quotes`, `quote_items` | Orçamentos e suas linhas |
| Financeiro | `financial_entries` | Receitas, despesas, vencimentos e pagamentos |
| Governança | `audit_logs` | Histórico imutável de ações relevantes |

## Relacionamentos principais

```text
Company
├── Members ── Profile ── TechnicianProfile
├── Client
│   └── Equipment
│       └── WorkOrderEquipment ── WorkOrder
├── ServiceRequest ──────────────┘
├── WorkOrder ── WorkOrderParts ── Part
│            ├─ WorkOrderPhotos
│            └─ WorkOrderSignatures
├── Quote ── QuoteItems
└── FinancialEntry
```

- Um cliente pode ter muitos equipamentos.
- Um chamado pode apontar para um equipamento e pode originar uma ordem de serviço.
- Uma OS pode envolver vários equipamentos e várias peças.
- Fotos, assinatura, orçamento e financeiro referenciam a OS quando aplicável.
- `quote_items` e `work_order_*` usam a entidade pai para determinar a empresa e manter o isolamento.

## Papéis

- `OWNER`: controle total da empresa.
- `ADMIN`: administração ampla, membros e cadastros.
- `MANAGER`: gestão operacional, chamados, OS, peças e orçamentos.
- `TECHNICIAN`: consulta dos dados necessários e atualização das OS atribuídas.
- `VIEWER`: leitura dos dados da empresa.

O vínculo efetivo fica em `company_members.role_code`. `user_roles` é o catálogo estável de papéis, evitando textos soltos na aplicação.

## RLS preparada

A migration habilita RLS em todas as tabelas e deixa helpers para uso futuro com Supabase Auth:

- `is_company_member(company_id)` limita leitura à empresa do usuário.
- `can_manage_company(company_id)` permite escrita a Owner/Admin/Manager.
- `can_access_work_order(work_order_id)` permite ao técnico acessar OS atribuída.

As policies são uma base inicial. Antes de produção, revisar operações específicas de convite, criação da primeira empresa, upload de Storage e regras de transição de status.

## Fluxo principal

```text
Cliente
  → Equipamento
  → Chamado
  → Ordem de Serviço
  → Técnico
  → Peças / Fotos
  → Assinatura
  → Conclusão
  → Financeiro
```

## Convenções

- IDs usam UUID.
- Datas e horários usam `timestamptz`; datas de calendário usam `date`.
- Valores financeiros usam `numeric(12,2)`.
- `created_at`/`updated_at` são preenchidos no banco; tabelas editáveis usam trigger de atualização.
- Caminhos de fotos e assinaturas são strings para futura integração com Supabase Storage.
- O arquivo TypeScript em `src/types/database.ts` espelha o contrato inicial para a UI e futuros adapters.

## Arquivos

- `supabase/migrations/0001_initial_schema.sql`: schema, enums, índices, triggers e RLS preparada.
- `src/types/database.ts`: enums e entidades TypeScript.
- `src/lib/modules.ts`: catálogo de módulos futuros usado pela tela inicial.

## Próxima fase

Definir o fluxo de criação de empresa e convite de membros, escolher a estratégia de autenticação e validar a migration em um projeto Supabase de desenvolvimento. Só depois conectar queries e construir o Dashboard.
