import httpx
from typing import List, Dict, Any
from backend.app.kernels.base import LLMKernelAdapter
from backend.app.core.config import settings

class GeminiAdapter(LLMKernelAdapter):
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.model = settings.GEMINI_MODEL
        self.client = httpx.AsyncClient(timeout=60.0)
        
    async def generate_chat_completion(self, messages: List[Dict[str, str]], temperature: float = 0.7) -> str:
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is not configured in settings.")
            
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model}:generateContent?key={self.api_key}"
        
        contents = []
        system_instruction = None
        
        for msg in messages:
            role = msg["role"]
            if role == "system":
                system_instruction = {"parts": [{"text": msg["content"]}]}
            else:
                gemini_role = "user" if role == "user" else "model"
                contents.append({
                    "role": gemini_role,
                    "parts": [{"text": msg["content"]}]
                })
                
        payload = {
            "contents": contents,
            "generationConfig": {
                "temperature": temperature
            }
        }
        
        if system_instruction:
            payload["systemInstruction"] = system_instruction
            
        headers = {"Content-Type": "application/json"}
        response = await self.client.post(url, json=payload, headers=headers)
        response.raise_for_status()
        
        data = response.json()
        try:
            return data["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError):
            raise RuntimeError(f"Unexpected response structure from Gemini API: {data}")

    async def generate_embeddings(self, text: str) -> List[float]:
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is not configured in settings.")
            
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key={self.api_key}"
        
        payload = {
            "model": "models/gemini-embedding-2",
            "content": {
                "parts": [{"text": text}]
            }
        }
        
        headers = {"Content-Type": "application/json"}
        response = await self.client.post(url, json=payload, headers=headers)
        response.raise_for_status()
        
        data = response.json()
        try:
            return data["embedding"]["values"]
        except KeyError:
            raise RuntimeError(f"Unexpected response structure from Gemini Embedding API: {data}")
            
    async def __aenter__(self):
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()
