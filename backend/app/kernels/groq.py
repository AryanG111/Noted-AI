import httpx
from typing import List, Dict, Any
from backend.app.kernels.base import LLMKernelAdapter
from backend.app.core.config import settings

class GroqAdapter(LLMKernelAdapter):
    def __init__(self):
        self.api_key = settings.GROQ_API_KEY
        self.models_fallback_chain = [
            settings.GROQ_MODEL or "openai/gpt-oss-120b",
            "openai/gpt-oss-120b",
            "openai/gpt-oss-20b",
            "qwen/qwen3.8-27b"
        ]
        self.models_fallback_chain = list(dict.fromkeys(self.models_fallback_chain))
        self.client = httpx.AsyncClient(timeout=60.0)
        
    async def generate_chat_completion(self, messages: List[Dict[str, str]], temperature: float = 0.7) -> str:
        if not self.api_key:
            raise ValueError("GROQ_API_KEY is not configured in settings.")
            
        url = "https://api.groq.com/openai/v1/chat/completions"
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}"
        }
        
        last_error = None
        for model in self.models_fallback_chain:
            payload = {
                "model": model,
                "messages": messages,
                "temperature": temperature
            }
            try:
                response = await self.client.post(url, json=payload, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    return data["choices"][0]["message"]["content"]
                elif response.status_code in [429, 404, 500, 503]:
                    print(f"[Groq Fallback] Model '{model}' returned {response.status_code}. Retrying with next model...")
                    last_error = f"{model} (HTTP {response.status_code})"
                    continue
                else:
                    response.raise_for_status()
            except httpx.HTTPError as e:
                last_error = str(e)
                continue
                
        raise RuntimeError(f"All Groq fallback models failed. Last error: {last_error}")

    async def generate_embeddings(self, text: str) -> List[float]:
        # Groq does not natively provide embedding models. 
        # We fall back to Ollama local embeddings if Ollama is available, or Gemini if configured.
        if settings.GEMINI_API_KEY:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={settings.GEMINI_API_KEY}"
            payload = {
                "model": "models/text-embedding-004",
                "content": {"parts": [{"text": text}]}
            }
            response = await self.client.post(url, json=payload, headers={"Content-Type": "application/json"})
            if response.status_code == 200:
                return response.json()["embedding"]["values"]
                
        # Default fallback to Ollama
        url = f"{settings.OLLAMA_BASE_URL}/api/embeddings"
        payload = {
            "model": settings.OLLAMA_EMBED_MODEL,
            "prompt": text
        }
        response = await self.client.post(url, json=payload)
        response.raise_for_status()
        return response.json()["embedding"]
        
    async def __aenter__(self):
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()
