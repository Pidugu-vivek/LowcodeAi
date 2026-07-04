import fs from 'fs';
import path from 'path';
import { WorkflowConfig } from '../domain/workflowConfig';

const CONFIG_DIR = process.env.CONFIG_DIR || path.join(process.cwd(), 'config');

function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function filePathFor(id: string): string {
  return path.join(CONFIG_DIR, `${id}.json`);
}

export function loadAllConfigs(): WorkflowConfig[] {
  ensureConfigDir();
  return fs
    .readdirSync(CONFIG_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const raw = fs.readFileSync(path.join(CONFIG_DIR, f), 'utf-8');
      return JSON.parse(raw) as WorkflowConfig;
    });
}

export function saveConfig(config: WorkflowConfig): void {
  ensureConfigDir();
  fs.writeFileSync(filePathFor(config.id), JSON.stringify(config, null, 2), 'utf-8');
}

export function deleteConfigFile(id: string): boolean {
  const filePath = filePathFor(id);
  if (!fs.existsSync(filePath)) return false;
  fs.unlinkSync(filePath);
  return true;
}
