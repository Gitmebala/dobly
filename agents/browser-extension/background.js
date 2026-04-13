const API_BASE = 'http://localhost:3000';
const taskTabs = new Map();

async function getSettings() {
  return await chrome.storage.local.get(['agentId', 'userId', 'workerSecret']);
}

async function post(path, body) {
  const settings = await getSettings();
  const response = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-dobly-agent-secret': settings.workerSecret || '',
    },
    body: JSON.stringify(body),
  });
  return await response.json();
}

async function heartbeat() {
  const settings = await getSettings();
  if (!settings.agentId || !settings.userId) return;
  await post('/api/internal/agents/heartbeat', {
    agentId: settings.agentId,
    userId: settings.userId,
  });
}

async function claimTask() {
  const settings = await getSettings();
  if (!settings.agentId || !settings.userId) return null;
  const data = await post('/api/internal/agents/tasks/claim', {
    agentId: settings.agentId,
    userId: settings.userId,
    agentType: 'browser',
  });
  return data.task || null;
}

async function completeTask(taskId, result, status = 'completed') {
  const settings = await getSettings();
  await post(`/api/internal/agents/tasks/${taskId}/complete`, {
    agentId: settings.agentId,
    userId: settings.userId,
    status,
    result,
  });
}

function waitForTabLoad(tabId) {
  return new Promise((resolve) => {
    const listener = (updatedTabId, info) => {
      if (updatedTabId === tabId && info.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  });
}

async function executeBrowserTask(task) {
  const payload = task.payload || {};
  const config = payload.config || {};
  const targetUrl = config.targetUrl || 'about:blank';
  const instruction = config.instruction || 'No instruction provided';
  const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });

  try {
    const tab = await chrome.tabs.create({ url: targetUrl, active: true });
    taskTabs.set(task.id, {
      tabId: tab.id,
      windowId: tab.windowId,
      previousTabId: currentTab?.id ?? null,
      keepTabOpen: Boolean(config.keepTabOpen),
      captureScreenshot: config.captureScreenshot !== false,
    });

    await waitForTabLoad(tab.id);
    await chrome.tabs.sendMessage(tab.id, {
      type: 'DOBLY_EXECUTE_TASK',
      taskId: task.id,
      instruction,
      payload,
    });
  } catch (error) {
    await completeTask(
      task.id,
      {
        error: error instanceof Error ? error.message : 'Browser task failed before execution.',
        targetUrl,
      },
      'failed'
    );
  }
}

async function captureTaskScreenshot(taskId) {
  const tabState = taskTabs.get(taskId);
  if (!tabState?.captureScreenshot || !tabState.windowId) {
    return null;
  }

  try {
    return await chrome.tabs.captureVisibleTab(tabState.windowId, { format: 'png' });
  } catch {
    return null;
  }
}

async function cleanupTaskTab(taskId) {
  const tabState = taskTabs.get(taskId);
  if (!tabState) return;

  taskTabs.delete(taskId);

  if (tabState.previousTabId) {
    try {
      await chrome.tabs.update(tabState.previousTabId, { active: true });
    } catch {}
  }

  if (!tabState.keepTabOpen && tabState.tabId) {
    try {
      await chrome.tabs.remove(tabState.tabId);
    } catch {}
  }
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type === 'DOBLY_TASK_RESULT') {
    (async () => {
      const screenshot = await captureTaskScreenshot(message.taskId);
      const enrichedResult = {
        ...(message.result || {}),
        screenshot,
        screenshotCapturedAt: screenshot ? new Date().toISOString() : null,
      };

      await completeTask(message.taskId, enrichedResult, message.status || 'completed');
      await cleanupTaskTab(message.taskId);
    })();
  }
});

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create('dobly-heartbeat', { periodInMinutes: 1 });
  chrome.alarms.create('dobly-claim', { periodInMinutes: 1 });
});

chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'dobly-heartbeat') {
    await heartbeat();
  }
  if (alarm.name === 'dobly-claim') {
    const task = await claimTask();
    if (task) {
      await executeBrowserTask(task);
    }
  }
});
