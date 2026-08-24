import json
import re
from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional

class LLMKernelAdapter(ABC):
    @abstractmethod
    async def generate_chat_completion(self, messages: List[Dict[str, str]], temperature: float = 0.7) -> str:
        """Generate a chat completion response from the model."""
        pass

    @abstractmethod
    async def generate_embeddings(self, text: str) -> List[float]:
        """Generate vector embeddings for the provided text."""
        pass

    async def extract_structured_data(self, text: str, prompt_instructions: str) -> Dict[str, Any]:
        """
        Extract structured JSON data from text based on instructions.
        Includes a default robust fallback parser that extracts JSON from markdown blocks.
        """
        messages = [
            {"role": "system", "content": "You are an expert data extraction assistant. You must respond ONLY with a valid JSON object matching the requested schema. Do not write explanations, introductions, or code formatting besides a raw JSON string or JSON codeblock."},
            {"role": "user", "content": f"{prompt_instructions}\n\nInput Text to analyze:\n--- \n{text}\n---"}
        ]
        
        response = await self.generate_chat_completion(messages, temperature=0.1)
        return self._parse_json_safely(response)

    def _parse_json_safely(self, text: str) -> Dict[str, Any]:
        """Cleans and extracts JSON content from raw model outputs."""
        text = text.strip()
        
        # Try direct parse first
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass
            
        # Try to find JSON inside markdown code blocks ```json ... ``` or ``` ... ```
        match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', text)
        if match:
            try:
                return json.loads(match.group(1).strip())
            except json.JSONDecodeError:
                pass
                
        # Try extracting text starting with { and ending with }
        match_bracket = re.search(r'(\{[\s\S]*\})', text)
        if match_bracket:
            try:
                return json.loads(match_bracket.group(1).strip())
            except json.JSONDecodeError:
                pass
                
        # Fallback empty dict
        return {}
