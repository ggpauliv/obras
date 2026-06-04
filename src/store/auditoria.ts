// Repositório de Eventos de Auditoria — com API REST
import { apiClient } from '../api/client';
import type { EventoAuditoria } from './types';

/** Lista eventos; se `obraId` for informado, filtra por obra (mais recentes primeiro). */
export async function listarEventos(obraId?: string): Promise<EventoAuditoria[]> {
  if (obraId && (obraId === 'undefined' || obraId === 'null')) return [];
  try {
    const eventos = await apiClient.listarAuditoria(obraId);
    return eventos.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
  } catch {
    return [];
  }
}

/** Registra um novo evento de auditoria (registrado automaticamente pelo backend). */
export async function registrarEvento(
  evento: Omit<EventoAuditoria, 'id' | 'data'>
): Promise<EventoAuditoria> {
  // Nota: auditoria é registrada automaticamente pelo backend nas operações CRUD
  // Esta função é mantida para compatibilidade com o código antigo
  console.warn('⚠️  registrarEvento deve ser chamado pelo backend automaticamente');
  return {
    ...evento,
    id: '',
    data: new Date().toISOString(),
  };
}
