import httpx
from typing import List, Dict
from backend.app.kernels.base import LLMKernelAdapter
from backend.app.core.config import settings


class GrokAdapter(LLMKernelAdapter):
    def __init__(self):
        self.api_key = settings.XAI_API_KEY
        self.model = settings.XAI_MODEL

        self.client = httpx.AsyncClient(
            timeout=3600.0
        )

    async def generate_chat_completion(
        self,
        messages: List[Dict[str, str]],
        temperature: float = 0.7,
    ) -> str:

        if not self.api_key:
            raise ValueError(
                "XAI_API_KEY is not configured in settings."
            )

        url = "https://api.x.ai/v1/chat/completions"

        payload = {
            "model": self.model,
            "messages": messages,
            "temperature": temperature,
        }

        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.api_key}",
        }

        response = await self.client.post(
            url,
            json=payload,
            headers=headers,
        )

        response.raise_for_status()

        data = response.json()

        try:
            return data["choices"][0]["message"]["content"]
        except (KeyError, IndexError, TypeError):
            raise RuntimeError(
                f"Unexpected response structure from xAI API: {data}"
            )

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.client.aclose()