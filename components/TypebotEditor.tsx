import fs from 'fs';
import path from 'path';

const flowsFilePath = path.join(process.cwd(), 'data', 'typebot-flows.json');

function ensureFileExists() {
  if (!fs.existsSync(path.dirname(flowsFilePath))) {
    fs.mkdirSync(path.dirname(flowsFilePath), { recursive: true });
  }
  if (!fs.existsSync(flowsFilePath)) {
    fs.writeFileSync(flowsFilePath, JSON.stringify([]));
  }
}

export function listFlows() {
  ensureFileExists();
  try {
    const data = fs.readFileSync(flowsFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Erro ao listar fluxos:', error);
    return [];
  }
}

export function getFlow(id: string) {
  ensureFileExists();
  try {
    const flows = listFlows();
    const flow = flows.find((flow: any) => flow.id === id);
    return flow ? { ...flow, blocks: Array.isArray(flow.blocks) ? flow.blocks : [] } : null;
  } catch (error) {
    console.error('Erro ao buscar fluxo:', error);
    return null;
  }
}

export function saveFlow(id: string, name: string, status: string, blocks: any[], typebotId: string | null) {
  ensureFileExists();
  try {
    const flows = listFlows();
    const updatedFlows = flows.some((flow: any) => flow.id === id)
      ? flows.map((flow: any) =>
          flow.id === id
            ? { id, name, status, blocks, typebotId, created_at: flow.created_at }
            : flow
        )
      : [...flows, { id, name, status, blocks, typebotId, created_at: new Date().toISOString() }];
    fs.writeFileSync(flowsFilePath, JSON.stringify(updatedFlows, null, 2));
    console.log(`Fluxo ${id} salvo com sucesso.`);
  } catch (error) {
    console.error('Erro ao salvar fluxo:', error);
    throw error;
  }
}