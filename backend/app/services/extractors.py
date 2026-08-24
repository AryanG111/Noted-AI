import datetime
from typing import Dict, Any, List, Optional
from backend.app.kernels import get_kernel

class CognitiveExtractorService:
    async def extract_all(
        self,
        content: str,
        occupation: str = "Software Engineer",
        ai_tone: str = "balanced",
        current_time: Optional[datetime.datetime] = None,
        provider: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Orchestrates all cognitive extractions (summary, tags, contacts, tasks) from a raw note.
        Passes current local time to resolve relative dates, and user profiles to personalize output.
        """
        if not current_time:
            current_time = datetime.datetime.now()
            
        time_str = current_time.strftime("%Y-%m-%dT%H:%M:%S")
        
        prompt_instructions = f"""
        Analyze the following user note. You must extract and summarize the content.
        
        Reference Information:
        - Current local time is: {time_str} (Use this to resolve relative dates like 'tomorrow', 'next week', 'Friday').
        - User's Occupation: {occupation} (Use this context to prioritize terms, categories, or action items relevant to their domain).
        - AI Summary/Tone Style Preference: {ai_tone} (You MUST summarize the note using this tone/style. If tone is 'concise', write extremely short bullet-like summaries. If tone is 'creative', use engaging summaries with analogies. If tone is 'technical', emphasize specifications, data, and jargon. If tone is 'balanced', provide a normal objective, balanced summary).
        
        Respond with a JSON object containing exactly the following keys:
        1. "title": A short, friendly, descriptive title (maximum 6 words). If the note is empty or too short, make a default title.
        2. "summary": A concise 1-2 sentence summary of the key content or actions.
        3. "tags": An array of lowercase string keywords (concepts, projects, or categories). Max 5 tags.
        4. "importance": An integer rating string from "1" to "10" reflecting the importance of this memory (e.g. "1" for trivial shopping list, "10" for a crucial business negotiation).
        5. "memory_type": A classification string which MUST be exactly one of: "idea", "meeting", "decision", "expense", or "general".
        6. "contacts": An array of names (first name, last name or full name) of people mentioned in the note text. Only extract actual names of people, not companies or products.
        7. "tasks": An array of items, each with:
           - "description": A clear action item (e.g., "Send project proposal to Rahul").
           - "due_date": An ISO datetime string (YYYY-MM-DDTHH:MM:SS) representing the task deadline, resolved using the reference current time. If no specific deadline is mentioned, return null.
           
        Example Output Format:
        {{
          "title": "Meeting with Rahul regarding proposal",
          "summary": "Discussed project architecture with Rahul and planned the next steps for proposal submission.",
          "tags": ["meeting", "proposal", "architecture"],
          "importance": "8",
          "memory_type": "meeting",
          "contacts": ["Rahul"],
          "tasks": [
            {{
              "description": "Send proposal to Rahul",
              "due_date": "2026-08-28T17:00:00"
            }}
          ]
        }}
        """
        
        # Instantiate the active kernel
        kernel = get_kernel(provider)
        try:
            extracted_data = await kernel.extract_structured_data(content, prompt_instructions)
            
            # Ensure all keys exist with default fallbacks
            return {
                "title": extracted_data.get("title", "Untitled Note"),
                "summary": extracted_data.get("summary", ""),
                "tags": extracted_data.get("tags", []),
                "importance": str(extracted_data.get("importance", "5")),
                "memory_type": extracted_data.get("memory_type", "general"),
                "contacts": extracted_data.get("contacts", []),
                "tasks": extracted_data.get("tasks", [])
            }
        except Exception as e:
            # Fallback if LLM extraction fails completely (ensures notes can still be saved)
            import traceback
            print("Cognitive extraction failed traceback:")
            traceback.print_exc()
            return {
                "title": "Untitled Note",
                "summary": "Note saved. Processing error.",
                "tags": [],
                "importance": "5",
                "memory_type": "general",
                "contacts": [],
                "tasks": []
            }

cognitive_extractor = CognitiveExtractorService()
