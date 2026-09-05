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
            
        day_name = current_time.strftime("%A")
        time_str = current_time.strftime("%Y-%m-%dT%H:%M:%S")
        
        prompt_instructions = f"""
        Analyze the following user note or document. This may be a quick thought, a project note, or a full dump of Meeting Minutes / MoM (Minutes of Meeting, transcript, or sync notes).
        
        Reference Information:
        - Current local time is: {time_str} ({day_name}).
        - Date resolution rules: You MUST resolve relative dates (like 'this Sunday', 'next Sunday', 'tomorrow', 'next week', 'Friday', 'by EOD', 'next month') into an absolute ISO datetime (YYYY-MM-DDTHH:MM:SS) calculated from today's reference date and day of week ({day_name}, {time_str}).
        - User's Occupation: {occupation} (Use this context to prioritize terms, categories, or action items relevant to their domain).
        - AI Summary/Tone Style Preference: {ai_tone}
        
        Entity & MoM Extraction Rules:
        1. "title": A short, friendly, descriptive title (maximum 6 words, e.g. "Sprint Sync MoM", "Client Kickoff Meeting").
        2. "summary": A concise 1-3 sentence summary capturing the primary objective, major decisions, and overall outcome of the note/meeting.
        3. "tags": An array of lowercase keywords/topics (e.g. ["meeting", "sprint-planning", "marketing"]). Max 5 tags.
        4. "importance": An integer rating string from "1" to "10" reflecting the priority and operational impact of this memory.
        5. "memory_type": A classification string which MUST be exactly one of: "meeting", "idea", "decision", "expense", or "general". If the text contains meeting minutes, attendee lists, or discussion points, classify as "meeting".
        6. "contacts": An array of ALL individual people, attendees, teams, departments, groups, and organizations/institutions mentioned or assigned tasks in the note/MoM (e.g. ["Rahul", "Priya Sharma", "Ops Team", "Frontend Team", "Stanford University", "Acme Corp"]). Do not ignore or drop teams or organizational units.
        7. "tasks": An array of ALL actionable items, next steps, commitments, or deliverables identified in the note/MoM:
           - "description": Clear, self-contained action item stating who is doing what (e.g., "Priya to send updated API architecture document to team", "Ops Team to provision staging environment", "Fix CORS issue on staging").
           - "due_date": An ISO datetime string (YYYY-MM-DDTHH:MM:SS) representing the deadline, resolved accurately. If no explicit date is mentioned, return null.
           
        Example Output Format:
        {{
          "title": "Q3 Roadmap Alignment MoM",
          "summary": "Met with engineering and product leads to finalize Q3 deliverables. Agreed to prioritize database sharding and launch mobile app beta by next Friday.",
          "tags": ["meeting", "roadmap", "engineering", "q3"],
          "importance": "9",
          "memory_type": "meeting",
          "contacts": ["Shabbir", "Vishal", "Ops Team", "Jenny"],
          "tasks": [
            {{
              "description": "Shabbir to benchmark PostgreSQL connection pooling",
              "due_date": "{time_str[:10]}T17:00:00"
            }},
            {{
              "description": "Vishal to share draft slide deck with stakeholders",
              "due_date": null
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
            import traceback
            print("Cognitive extraction failed traceback:")
            traceback.print_exc()
            raise e

cognitive_extractor = CognitiveExtractorService()
