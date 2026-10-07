export type FutureModuleKey =
  | "dashboard" | "clients" | "equipment" | "tickets" | "workOrders"
  | "preventive" | "corrective" | "technicians" | "parts" | "quotes"
  | "photos" | "signatures" | "finance" | "reports" | "users";

export const futureModules: Array<{ key: FutureModuleKey; name: string; description: string }> = [
  { key: "dashboard", name: "Dashboard", description: "Visão geral da operação" },
  { key: "clients", name: "Academias / Clientes", description: "Unidades e contratos" },
  { key: "equipment", name: "Equipamentos", description: "Ativos e histórico" },
  { key: "tickets", name: "Chamados", description: "Entrada e triagem" },
  { key: "workOrders", name: "Ordens de Serviço", description: "Execução rastreável" },
  { key: "preventive", name: "Manutenção Preventiva", description: "Planos e recorrência" },
  { key: "corrective", name: "Manutenção Corretiva", description: "Resposta a falhas" },
  { key: "technicians", name: "Técnicos", description: "Times e atribuições" },
  { key: "parts", name: "Peças", description: "Estoque e consumo" },
  { key: "quotes", name: "Orçamentos", description: "Aprovação de custos" },
  { key: "photos", name: "Fotos Antes/Depois", description: "Evidências de serviço" },
  { key: "signatures", name: "Assinaturas", description: "Aceite de execução" },
  { key: "finance", name: "Financeiro", description: "Custos e faturamento" },
  { key: "reports", name: "Relatórios", description: "Indicadores operacionais" },
  { key: "users", name: "Usuários e Permissões", description: "Acesso por função" },
];
