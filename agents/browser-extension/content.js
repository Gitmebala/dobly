function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForSelector(selector, timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const el = document.querySelector(selector);
    if (el) return el;
    await sleep(250);
  }
  throw new Error(`Selector not found: ${selector}`);
}

async function runAction(action, collected) {
  switch (action.type) {
    case 'wait': {
      await sleep(Number(action.ms || 1000));
      return { waited: Number(action.ms || 1000) };
    }
    case 'waitForSelector': {
      await waitForSelector(action.selector, Number(action.timeoutMs || 10000));
      return { selector: action.selector, found: true };
    }
    case 'click': {
      const el = await waitForSelector(action.selector, Number(action.timeoutMs || 10000));
      el.click();
      return { selector: action.selector, clicked: true };
    }
    case 'type': {
      const el = await waitForSelector(action.selector, Number(action.timeoutMs || 10000));
      const value = String(action.value || '');
      el.focus();
      if ('value' in el) {
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      } else {
        el.textContent = value;
      }
      return { selector: action.selector, typed: true, value };
    }
    case 'extractText': {
      const el = await waitForSelector(action.selector, Number(action.timeoutMs || 10000));
      const text = (el.innerText || el.textContent || '').trim();
      collected[action.outputKey || action.selector] = text;
      return { selector: action.selector, text };
    }
    case 'extractAttribute': {
      const el = await waitForSelector(action.selector, Number(action.timeoutMs || 10000));
      const value = el.getAttribute(action.attribute || 'href');
      collected[action.outputKey || action.selector] = value;
      return { selector: action.selector, attribute: action.attribute || 'href', value };
    }
    default:
      throw new Error(`Unsupported browser action: ${action.type}`);
  }
}

async function runActionWithRetry(action, collected, defaultRetries = 1) {
  const retries = Number(action.retries ?? defaultRetries);
  let lastError = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    try {
      const result = await runAction(action, collected);
      return { attempt: attempt + 1, result };
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        await sleep(Number(action.retryDelayMs || 1000));
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Browser action failed');
}

async function verifySuccess(config) {
  if (!config.successSelector) {
    return null;
  }

  const selector = String(config.successSelector);
  const timeoutMs = Number(config.successTimeoutMs || 10000);
  await waitForSelector(selector, timeoutMs);

  return {
    selector,
    verified: true,
    timeoutMs,
  };
}

chrome.runtime.onMessage.addListener((message) => {
  if (message?.type !== 'DOBLY_EXECUTE_TASK') return;

  (async () => {
    try {
      const config = message.payload?.config || {};
      const pageModel = Array.isArray(config.pageModel) ? config.pageModel : [];
      const collected = {};
      const results = [];
      const defaultRetries = Number(config.defaultRetries || 1);

      for (const action of pageModel) {
        const result = await runActionWithRetry(action, collected, defaultRetries);
        results.push({ type: action.type, ...result });
      }

      const verification = await verifySuccess(config);

      chrome.runtime.sendMessage({
        type: 'DOBLY_TASK_RESULT',
        taskId: message.taskId,
        status: 'completed',
        result: {
          url: window.location.href,
          title: document.title,
          instruction: message.instruction,
          collected,
          actions: results,
          verification,
        },
      });
    } catch (error) {
      chrome.runtime.sendMessage({
        type: 'DOBLY_TASK_RESULT',
        taskId: message.taskId,
        status: 'failed',
        result: {
          error: error instanceof Error ? error.message : 'Unknown browser agent error',
          url: window.location.href,
          title: document.title,
        },
      });
    }
  })();
});
