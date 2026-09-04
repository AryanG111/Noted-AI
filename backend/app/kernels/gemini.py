import httpx
from typing import List, Dict, Any
from backend.app.kernels.base import LLMKernelAdapter
from backend.app.core.config import settings

class GeminiAdapter(LLMKernelAdapter):
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        # Fallback list of models according to highest available quota & performance
        # 1. Gemma 4 26B (30 RPM, 14.4K RPD)
        # 2. Gemma 4 31B (30 RPM, 14.4K RPD)
        # 3. Gemini 3.1 Flash Lite (15 RPM, 500 RPD)
        # 4. Gemini 3.5 Flash Lite (15 RPM, 500 RPD)
        # 5. Gemini 2.5 Flash Lite (10 RPM, 20 RPD)
        # 6. Gemini 2.5 Flash / Gemini 3 Flash / Gemini 3.5 Flash (5 RPM, 20 RPD)
        primary_model = settings.GEMINI_MODEL or "gemma-4-26b-a4b-it"
        self.models_fallback_chain = [
            primary_model,
            "gemma-4-26b-a4b-it",
            "gemma-4-31b-it",
            "gemini-3.1-flash-lite",
            "gemini-3.5-flash-lite",
            "gemini-2.5-flash-lite",
            "gemini-2.5-flash",
            "gemini-3-flash",
            "gemini-3.5-flash",
            "gemini-2.0-flash",
            "gemini-1.5-flash"
        ]
        # Remove duplicate model names while preserving order
        self.models_fallback_chain = list(dict.fromkeys(self.models_fallback_chain))
        self.client = httpx.AsyncClient(timeout=60.0)
        
    async def generate_chat_completion(self, messages: List[Dict[str, str]], temperature: float = 0.7) -> str:
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is not configured in settings.")
            
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
        last_error = None

        # Iterate through the fallback models chain upon rate limit (429) or model not found (404/503)
        for model in self.models_fallback_chain:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={self.api_key}"
            try:
                response = await self.client.post(url, json=payload, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    parts = data["candidates"][0]["content"]["parts"]
                    non_thought_parts = [p["text"] for p in parts if not p.get("thought")]
                    if not non_thought_parts:
                        return parts[0]["text"]
                    return "".join(non_thought_parts)
                
                # If rate limited (429) or model unavailable, log and try next model in chain
                if response.status_code in [429, 404, 500, 503]:
                    err_json = response.json().get("error", {})
                    err_msg = err_json.get("message", f"HTTP {response.status_code}")
                    print(f"[Gemini Fallback] Model '{model}' failed ({err_msg}). Falling back to next candidate...")
                    last_error = f"{model}: {err_msg}"
                    continue
                else:
                    response.raise_for_status()
            except httpx.HTTPError as e:
                print(f"[Gemini Fallback] Network error on model '{model}': {e}. Trying next...")
                last_error = str(e)
                continue
                
        raise RuntimeError(f"All Gemini fallback models exhausted. Last error: {last_error}")

    async def generate_embeddings(self, text: str) -> List[float]:
        if not self.api_key:
            raise ValueError("GEMINI_API_KEY is not configured in settings.")
            
        embedding_models = [
            "gemini-embedding-2",
            "text-embedding-004"
        ]
        
        headers = {"Content-Type": "application/json"}
        last_error = None
        
        for embed_model in embedding_models:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{embed_model}:embedContent?key={self.api_key}"
            payload = {
                "model": f"models/{embed_model}",
                "content": {
                    "parts": [{"text": text}]
                }
            }
            if embed_model == "gemini-embedding-2":
                payload["outputDimensionality"] = 768
                
            try:
                response = await self.client.post(url, json=payload, headers=headers)
                if response.status_code == 200:
                    data = response.json()
                    return data["embedding"]["values"]
                elif response.status_code in [429, 404, 500, 503]:
                    print(f"[Gemini Embedding Fallback] Model '{embed_model}' failed with status {response.status_code}. Retrying...")
                    last_error = f"{embed_model} failed (HTTP {response.status_code})"
                    continue
                else:
                    response.raise_for_status()
            except httpx.HTTPError as e:
                last_error = str(e)
                continue
                
        raise RuntimeError(f"All Gemini embedding models failed. Last error: {last_error}")
            
    async def __aenter__(self):
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()
