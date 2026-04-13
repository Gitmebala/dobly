# Dobly Local Agent

Minimal scaffold for the Dobly desktop/local agent.

Environment variables:
- WORKER_SECRET
- DOBLY_API_BASE
- DOBLY_USER_ID
- DOBLY_AGENT_ID (optional)

Current behavior:
- registers as a local agent
- heartbeats to Dobly
- claims local tasks
- immediately marks them completed with a scaffold result

Next work:
- accessibility API integration
- desktop window targeting
- secure file operations
- local browser launching
- screenshot capture and verification
