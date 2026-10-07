# GYM MAINTENANCE — arquitetura oficial

## Produto e público

O usuário principal é o **prestador de serviço / empresa terceirizada de manutenção**. A empresa do sistema atende academias e outras empresas em campo.

O cliente é a **academia ou empresa atendida**. Cada prestador pode ter várias academias, equipamentos e visitas, sempre isolados por `company_id`.

## Fluxo central

```text
Academia → Equipamentos → Nova visita → Diagnóstico → Fotos
          → Materiais/Peças → Mão de obra → Orçamento → Serviço
          → Fotos depois → Histórico automático
```

`service_visits` é a entidade de atendimento em campo. Uma visita pode envolver vários equipamentos por meio de `service_visit_items`. O histórico não é duplicado: é derivado de visitas, diagnósticos, ordens, peças, orçamentos e fotos.

## Entidades principais

| Grupo | Entidades | Responsabilidade |
| --- | --- | --- |
| Organização | `companies`, `profiles`, `user_roles`, `company_members` | Prestador, usuários, papéis e isolamento |
| Academias | `clients`, `equipment` | Empresas atendidas e seus ativos |
| Campo | `service_visits`, `service_visit_items` | Visitas, diagnóstico e recomendação por máquina |
| Execução | `service_requests`, `work_orders`, `work_order_equipment` | Chamados e serviços executados |
| Evidências | `service_photos`, `work_order_photos`, `work_order_signatures` | Fotos antes/depois e futura integração Storage |
| Materiais | `parts`, `work_order_parts` | Estoque, peças e consumo |
| Comercial | `quotes`, `quote_items`, `quote_equipments` | Orçamentos técnicos e equipamentos envolvidos |
| Biblioteca técnica | `manufacturers`, `equipment_models`, `technical_components`, `technical_parts`, `model_components`, `model_parts`, `technical_documents` | Conhecimento reutilizável do prestador |
| Financeiro | `financial_entries` | Valores, vencimentos e pagamentos |
| Governança | `audit_logs` | Ações relevantes da empresa |

## Clientes e equipamentos

`clients` representa academias atendidas e suporta responsável, telefone, WhatsApp, e-mail, endereço, cidade, estado, observações e `last_visit_at`.

`equipment` pertence a um cliente e suporta nome, categoria, marca, modelo, número de série, código interno (`asset_code`), localização, status, observações e `primary_photo_path`. O fluxo futuro de Nova Visita poderá cadastrar um equipamento inline sem abandonar a visita.

## Visitas e histórico

Tipos de visita: `PREVENTIVE`, `CORRECTIVE`, `INSPECTION`, `INSTALLATION`.

`service_photos` aceita associação opcional com visita, equipamento, orçamento e ordem de serviço, com tipos `PROBLEM`, `BEFORE`, `AFTER` e `GENERAL`. O caminho aponta para futura integração com Supabase Storage e câmera do celular.

Os helpers server-only são:

- `getClientHistory(clientId)` em `src/lib/field-service/history.ts`;
- `getEquipmentHistory(equipmentId)` em `src/lib/field-service/history.ts`.

Ambos exigem empresa ativa e filtram por `company_id` antes de consultar os dados.

## Orçamento técnico

`quote_items` foi preparado com `item_type` (`PRODUCT`, `MATERIAL`, `SERVICE`, `LABOR`) e `unit` (`UNIDADE`, `METRO`, `CENTIMETRO`, `METRO_QUADRADO`, `QUILO`, `LITRO`, `KIT`). `quote_equipments` permite associar vários equipamentos ao mesmo orçamento.

A futura renderização de PDF usará branding da empresa: `logo_path`, nome comercial, razão social, CPF/CNPJ, telefone, WhatsApp, e-mail, endereço, cidade, estado e site.

PDF, WhatsApp e Storage ainda não são integrações reais nesta fase; a migration deixa seus vínculos preparados.

## Biblioteca técnica

A biblioteca pertence inicialmente a cada prestador e não se mistura com estoque. `technical_parts` guarda informação técnica; `parts` e futuros produtos continuam sendo entidades operacionais/comerciais separadas.

`equipment.equipment_model_id` é opcional, então máquinas antigas continuam funcionando sem modelo. Quando preenchido, a Nova Visita pode abrir a ficha técnica e sugerir peças de `model_parts`.

As especificações são `jsonb` chave/valor, permitindo registrar medidas, correias, voltagem, rolamentos e novas propriedades sem migration a cada campo. Busca server-side cobre fabricante, modelo, código, peça e texto da especificação.

Documentos registram manual, catálogo, esquema e boletim com fonte, versão e página; nenhum conteúdo externo é baixado automaticamente.

## Segurança e multiempresa

O vínculo efetivo é `company_members.role_code`; `user_roles` permanece catálogo global. Toda entidade operacional nova tem `company_id` direto ou herda a empresa pela entidade pai. A migration `0003_field_service_core.sql` habilita RLS e usa `is_company_member`, `can_manage_company` e `can_access_service_visit`.

O app usa a primeira empresa ativa do usuário por enquanto, mas os helpers já retornam membership e company separadamente para permitir um seletor futuro.

## Migrations

- `0001_initial_schema.sql`: domínio inicial e RLS.
- `0002_auth_onboarding.sql`: perfil automático e criação segura da primeira empresa.
- `0003_field_service_core.sql`: núcleo oficial de prestador em campo.
- `0004_service_visit_workflow.sql`: visita transacional, materiais, serviços e Storage privado.
- `0005_technical_library.sql`: biblioteca técnica isolada por prestador.

`0005` não deve ser executada automaticamente pela aplicação. Aplicar manualmente no projeto Supabase após revisão.
