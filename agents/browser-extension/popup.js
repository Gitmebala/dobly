const API_BASE = 'http://localhost:3000';

async function registerAgent() {
  const userId = document.getElementById('userId').value.trim();
  const workerSecret = document.getElementById('workerSecret').value.trim();
  const status = document.getElementById('status');

  const response = await fetch(`${API_BASE}/api/internal/agents/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-dobly-agent-secret': workerSecret,
    },
    body: JSON.stringify({
      userId,
      name: 'Dobly Browser Agent',
      agentType: 'browser',
      capabilities: { dom: true, tabs: true },
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    status.textContent = data.error || 'Registration failed';
    return;
  }

  await chrome.storage.local.set({
    agentId: data.agent.id,
    userId,
    workerSecret,
  });

  status.textContent = `Registered: ${data.agent.id}`;
}

document.getElementById('registerBtn').addEventListener('click', registerAgent);
