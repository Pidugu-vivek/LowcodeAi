import { WorkflowConfig } from '../domain/workflowConfig';
import { loadAllConfigs, saveConfig, deleteConfigFile } from './fileStore';
import { logger } from '../logging/logger';

function registryKey(method: string, routePath: string): string {
  return `${method.toUpperCase()} ${routePath}`;
}

class WorkflowRegistry {
  private byKey = new Map<string, WorkflowConfig>();
  private byId = new Map<string, WorkflowConfig>();

  load(): void {
    this.byKey.clear();
    this.byId.clear();
    for (const config of loadAllConfigs()) {
      this.register(config);
    }
    logger.info({ count: this.byId.size }, 'Loaded workflow configs into registry');
  }

  register(config: WorkflowConfig): void {
    this.byKey.set(registryKey(config.method, config.path), config);
    this.byId.set(config.id, config);
  }

  getByRoute(method: string, routePath: string): WorkflowConfig | undefined {
    return this.byKey.get(registryKey(method, routePath));
  }

  getById(id: string): WorkflowConfig | undefined {
    return this.byId.get(id);
  }

  list(): WorkflowConfig[] {
    return [...this.byId.values()];
  }

  upsert(config: WorkflowConfig): void {
    const existing = this.byId.get(config.id);
    if (existing) {
      this.byKey.delete(registryKey(existing.method, existing.path));
    }
    saveConfig(config);
    this.register(config);
  }

  remove(id: string): boolean {
    const existing = this.byId.get(id);
    if (!existing) return false;
    deleteConfigFile(id);
    this.byId.delete(id);
    this.byKey.delete(registryKey(existing.method, existing.path));
    return true;
  }
}

export const workflowRegistry = new WorkflowRegistry();
