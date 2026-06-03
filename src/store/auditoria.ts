// Repositório de Eventos de Auditoria.
import { read, write, uid } from './db';
import type { EventoAuditoria } from './types';

const KEY = 'auditoria';

function todos(): EventoAuditoria[] {
  return read<EventoAuditoria[]>(KEY, []);
}

/** Lista eventos; se `obraId` for informado, filtra por obra (mais recentes primeiro). */
export function listarEventos(obraId?: string): EventoAuditoria[] {
  const lista = obraId ? todos().filter((e) => !e.obraId || e.obraId === obraId) : todos();
  return [...lista].sort((a, b) => b.data.localeCompare(a.data));
}

/** Registra um novo evento de auditoria. */
export function registrarEvento(
  evento: Omit<EventoAuditoria, 'id' | 'data'> & { data?: string }
): EventoAuditoria {
  const registro: EventoAuditoria = {
    ...evento,
    id: uid('e'),
    data: evento.data || new Date().toISOString(),
  };
  write(KEY, [...todos(), registro]);
  return registro;
}
