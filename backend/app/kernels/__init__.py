from backend.app.kernels.base import LLMKernelAdapter
from backend.app.kernels.gemini import GeminiAdapter
from backend.app.kernels.groq import GroqAdapter
from backend.app.kernels.ollama import OllamaAdapter
from backend.app.kernels.openrouter import OpenRouterAdapter
from backend.app.core.config import settings

def get_kernel(provider: str = None) -> LLMKernelAdapter:
    prov = provider or settings.ACTIVE_LLM_PROVIDER
    prov = prov.lower()
    if prov == "gemini":
        return GeminiAdapter()
    elif prov == "groq":
        return GroqAdapter()
    elif prov == "openrouter":
        return OpenRouterAdapter()
    elif prov == "ollama":
        return OllamaAdapter()
    else:
        raise ValueError(f"Unknown LLM provider: {prov}")

__all__ = ["LLMKernelAdapter", "GeminiAdapter", "GroqAdapter", "OllamaAdapter", "OpenRouterAdapter", "get_kernel"]
