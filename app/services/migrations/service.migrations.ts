// SPDX-License-Identifier: MIT OR Apache-2.0
// Módulo de Gerenciamento de Migrações no Frontend

import { serviceNotifications } from '../notifications/service.notifications';
import { toast } from 'sonner';

type MigrationListener = (migratingIds: Set<string>) => void;

class MigrationsFrontendService {
  private migratingProfiles: Set<string> = new Set();
  private listeners: Set<MigrationListener> = new Set();

  private notify() {
    const copy = new Set(this.migratingProfiles);
    this.listeners.forEach((fn) => fn(copy));
  }

  public subscribe(fn: MigrationListener): () => void {
    this.listeners.add(fn);
    fn(new Set(this.migratingProfiles));
    return () => {
      this.listeners.delete(fn);
    };
  }

  public isMigrating(profileId: string | number): boolean {
    return this.migratingProfiles.has(String(profileId));
  }

  public handleProfileMigrating(profileId: string, message?: string) {
    const pid = String(profileId);
    this.migratingProfiles.add(pid);
    this.notify();

    serviceNotifications.add({
      title: 'Migração de Segurança Iniciada',
      description: message || `Perfil #${pid}: criando backup seguro e atualizando configurações...`,
      type: 'migration',
      meta: { profile_id: pid },
    });
  }

  public handleProfileMigrated(profileId: string, success: boolean, message?: string) {
    const pid = String(profileId);
    this.migratingProfiles.delete(pid);
    this.notify();

    if (success) {
      serviceNotifications.add({
        title: 'Migração de Perfil Concluída',
        description: message || `Perfil #${pid} migrado e validado com sucesso. Backup seguro registrado.`,
        type: 'success',
        meta: { profile_id: pid },
      });
      toast.success(`Perfil #${pid} migrado com sucesso!`);
    } else {
      serviceNotifications.add({
        title: 'Aviso na Migração',
        description: message || `Houve uma falha ao migrar o perfil #${pid}.`,
        type: 'error',
        meta: { profile_id: pid },
      });
      toast.error(`Erro na migração do perfil #${pid}`);
    }
  }
}

export const serviceMigrations = new MigrationsFrontendService();
