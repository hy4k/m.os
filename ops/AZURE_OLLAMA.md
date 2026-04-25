# Azure Ollama Runtime

This phase makes the Azure Ollama connection explicit and testable.

## Required Environment

Set these in production/staging:

```bash
AZURE_OLLAMA_BASE_URL=http://<azure-ollama-host>:11434
AZURE_OLLAMA_MODEL=gemma4:e4b
AZURE_OLLAMA_FALLBACK_MODELS=gemma3:12b,qwen3-coder:latest
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
```

## Pull Models On Azure

Run on the Azure machine that hosts Ollama:

```bash
ollama pull gemma4:e4b
ollama pull nomic-embed-text
ollama pull gemma3:12b
ollama pull qwen3-coder:latest
```

## Verify From m.OS

The API exposes:

```bash
GET /api/llm/status
```

The web UI shows:
- whether Azure Ollama is reachable
- whether the selected Gemma model is installed
- which model route is used for coding/deep reasoning/private-fast policies

## Current Important Note

m.OS is now ready to connect to Azure Ollama, but it is only truly connected once `AZURE_OLLAMA_BASE_URL` points to the real Azure Ollama host and `/api/llm/status` reports `Azure Ollama online`.
