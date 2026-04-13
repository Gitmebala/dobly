const API_BASE = process.env.DOBLY_API_BASE || 'http://localhost:3000';
const WORKER_SECRET = process.env.WORKER_SECRET || '';
const USER_ID = process.env.DOBLY_USER_ID || '';
let agentId = process.env.DOBLY_AGENT_ID || '';

async function post(path, body) {
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-dobly-agent-secret': WORKER_SECRET,
    },
    body: JSON.stringify(body),
  });
  return await response.json();
}

async function ensureRegistered() {
  if (agentId) return agentId;
  const data = await post('/api/internal/agents/register', {
    userId: USER_ID,
    name: 'Dobly Local Agent',
    agentType: 'local',
    capabilities: { files: true, desktop: true },
  });
  agentId = data.agent.id;
  return agentId;
}

async function heartbeat() {
  await ensureRegistered();
  await post('/api/internal/agents/heartbeat', { agentId, userId: USER_ID });
}

async function claimTask() {
  await ensureRegistered();
  const data = await post('/api/internal/agents/tasks/claim', {
    agentId,
    userId: USER_ID,
    agentType: 'local',
  });
  return data.task || null;
}

async function completeTask(taskId, result, status = 'completed') {
  await post(`/api/internal/agents/tasks/${taskId}/complete`, {
    agentId,
    userId: USER_ID,
    status,
    result,
  });
}

async function run() {
  await heartbeat();
  const task = await claimTask();
  if (!task) return;

  const result = {
    note: 'Local agent scaffold received task. Replace with actual desktop automation.',
    payload: task.payload,
  };

  await completeTask(task.id, result, 'completed');
}

setInterval(() => {
  run().catch((error) => {
    console.error('Dobly local agent error', error);
  });
}, 10000);

run().catch((error) => {
  console.error('Dobly local agent startup error', error);
});
