import httpx
from typing import List, Dict, Any
from backend.app.kernels.base import LLMKernelAdapter
from backend.app.core.config import settings

class OllamaAdapter(LLMKernelAdapter):
    def __init__(self):
        self.base_url = settings.OLLAMA_BASE_URL
        self.model = settings.OLLAMA_MODEL
        self.embed_model = settings.OLLAMA_EMBED_MODEL
        self.client = httpx.AsyncClient(timeout=300.0)
        
    async def generate_chat_completion(self, messages: List[Dict[str, str]], temperature: float = 0.7) -> str:
        url = f"{self.base_url}/api/chat"
        payload = {
            "model": self.model,
            "messages": messages,
            "stream": False,
            "options": {
                "temperature": temperature
            }
        }
        
        response = await self.client.post(url, json=payload)
        response.raise_for_status()
        
        data = response.json()
        try:
            return data["message"]["content"]
        except KeyError:
            raise RuntimeError(f"Unexpected response structure from Ollama API: {data}")

    async def generate_embeddings(self, text: str) -> List[float]:
        url = f"{self.base_url}/api/embeddings"
        payload = {
            "model": self.embed_model,
            "prompt": text
        }
        
        response = await self.client.post(url, json=payload)
        response.raise_for_status()
        
        data = response.json()
        try:
            return data["embedding"]
        except KeyError:
            raise RuntimeError(f"Unexpected response structure from Ollama Embedding API: {data}")
            
    async def __aenter__(self):
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()
