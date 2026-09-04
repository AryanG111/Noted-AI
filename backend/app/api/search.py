from fastapi import APIRouter, Depends, HTTPException, status, Header, UploadFile, File, Query
from sqlalchemy.orm import Session
from typing import List, Dict, Any, Optional
import datetime
import httpx

from backend.app.core.db import get_db
from backend.app.api.auth import get_current_user
from backend.app.models.user import User
from backend.app.models.note import Note
from backend.app.models.contact import Contact
from backend.app.models.task import Task
from backend.app.schemas.search import SearchQuery, SearchResponse, SearchResultItem
from backend.app.services.vector_db import vector_db
from backend.app.kernels import get_kernel
from backend.app.core.config import settings

# Langchain imports
from langchain_classic.agents import AgentExecutor, create_react_agent
from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
from backend.app.services.agent_tools import get_agent_tools

# In-memory briefing cache keyed by user_id: { user_id: { "data": response_dict, "timestamp": datetime_utc } }
user_briefing_cache: Dict[str, Any] = {}
BRIEFING_CACHE_TTL_SECONDS = 2 * 3600  # 2 hours

router = APIRouter(prefix="/search", tags=["search"])

@router.get("", response_model=SearchResponse)
async def semantic_search(
    query: str,
    limit: int = 5,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generate query embedding and fetch similar notes from ChromaDB, 
    with a conceptual explanation of why they match.
    """
    kernel = get_kernel()
    try:
        query_embedding = await kernel.generate_embeddings(query)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate query embedding: {e}"
        )
        
    chroma_results = vector_db.query_notes(
        user_id=current_user.id,
        query_embedding=query_embedding,
        limit=limit
    )
    
    results = []
    for item in chroma_results:
        # Fetch actual creation date from DB if possible
        note_id = item["note_id"]
        note = db.query(Note).filter(Note.id == note_id).first()
        created_at = note.created_at if note else datetime.datetime.now()
        
        # Build a helpful relevance explanation
        tags = item.get("tags")
        explanation = f"Matched concept"
        if tags:
            explanation += f" associated with tags: {tags}"
            
        results.append(SearchResultItem(
            id=item["note_id"],
            title=item.get("title"),
            content=item.get("content"),
            summary=item.get("summary"),
            tags=item.get("tags"),
            score=item.get("score", 0.0),
            relevance_explanation=explanation,
            created_at=created_at
        ))
        
    return SearchResponse(query=query, results=results)

@router.post("/chat")
async def ask_noted(
    query_in: SearchQuery,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    x_active_kernel: Optional[str] = Header(None)
):
    """
    Ask Noted Q&A Chat endpoint: 
    Runs a Langchain ReAct agent using the user's active model selection to enable reasoning and DB actions.
    """
    query = query_in.query
    
    # Track accessed notes for citations
    accessed_notes = []
    
    # 1. Initialize LLM provider selection
    provider = (x_active_kernel or settings.ACTIVE_LLM_PROVIDER).lower()
    
    # 2. Initialize DB tools
    tools = get_agent_tools(db, current_user.id, accessed_notes, provider=provider)
    try:
        if provider == "gemini":
            if not settings.GEMINI_API_KEY:
                raise ValueError("GEMINI_API_KEY is not configured in your environment settings (.env).")
            llm = ChatOpenAI(
                base_url="https://generativelanguage.googleapis.com/v1beta/openai/",
                api_key=settings.GEMINI_API_KEY,
                model="gemma-4-26b-a4b-it",
                temperature=0.0
            )
        elif provider == "groq":
            if not settings.GROQ_API_KEY:
                raise ValueError("GROQ_API_KEY is not configured in your environment settings (.env).")
            llm = ChatOpenAI(
                base_url="https://api.groq.com/openai/v1",
                api_key=settings.GROQ_API_KEY,
                model="gemma2-9b-it",
                temperature=0.0
            )
        elif provider == "openrouter":
            if not settings.OPENROUTER_API_KEY:
                raise ValueError("OPENROUTER_API_KEY is not configured in your environment settings (.env).")
            llm = ChatOpenAI(
                base_url="https://openrouter.ai/api/v1",
                api_key=settings.OPENROUTER_API_KEY,
                model=settings.OPENROUTER_MODEL,
                temperature=0.0,
                default_headers={
                    "HTTP-Referer": settings.OPENROUTER_SITE_URL,
                    "X-Title": settings.OPENROUTER_SITE_NAME
                }
            )
        else: # ollama
            llm = ChatOpenAI(
                base_url=f"{settings.OLLAMA_BASE_URL}/v1",
                api_key="ollama",
                model=settings.OLLAMA_MODEL,
                temperature=0.0
            )
    except Exception as e:
        return {
            "answer": f"LLM Initialization failure ({provider}): {e}",
            "citations": []
        }
        
    # 3. Create prompt template
    template = """You are Noted AI, the private, warm, intelligent cognitive assistant for the user.
Answer the user's question as best you can. You have access to the following tools:

{tools}

Use the following format:

Question: the input question you must answer
Thought: you should always think about what to do. Always execute thoughts and actions step-by-step.
Action: the action to take, should be one of [{tool_names}]
Action Input: the input to the action
Observation: the result of the action
... (this Thought/Action/Action Input/Observation can repeat N times)
Thought: I now know the final answer
Final Answer: the final answer to the original input question. Write your final answer in a {ai_tone} style.

Begin!

User's Background: {user_background}
Current local time is: {current_time} (Use this to resolve relative dates like 'tomorrow', 'next week', 'Friday').

Question: {input}
Thought:{agent_scratchpad}"""

    prompt = PromptTemplate.from_template(template)
    
    # 4. Construct Agent & Executor
    try:
        agent = create_react_agent(llm, tools, prompt)
        agent_executor = AgentExecutor(agent=agent, tools=tools, verbose=True, handle_parsing_errors=True)
        
        # 5. Run async
        response = await agent_executor.ainvoke({
            "input": query,
            "user_background": current_user.occupation or "Software Engineer",
            "ai_tone": current_user.ai_tone or "balanced",
            "current_time": datetime.datetime.now().strftime("%Y-%m-%dT%H:%M:%S")
        })
        response_text = response.get("output", "Agent did not yield an output.")
    except Exception as e:
        print(f"Agent Execution error: {e}")
        response_text = f"An error occurred in the agent reasoning loop: {e}"
        
    return {
        "answer": response_text,
        "citations": accessed_notes
    }

@router.get("/briefing")
async def get_daily_briefing(
    force_refresh: bool = Query(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Generates a personalized Morning/Daily Cognitive Briefing and Memory Flashback.
    Caches results per user for 2 hours to minimize LLM usage unless force_refresh=True.
    """
    now = datetime.datetime.now(datetime.timezone.utc)
    user_key = str(current_user.id)
    user_name = current_user.full_name.split()[0] if current_user.full_name else "there"
    
    # Check in-memory 2-hour cache if not forcing refresh
    if not force_refresh and user_key in user_briefing_cache:
        cached_entry = user_briefing_cache[user_key]
        cached_time = cached_entry.get("timestamp")
        if cached_time:
            age_seconds = (now - cached_time).total_seconds()
            if age_seconds < BRIEFING_CACHE_TTL_SECONDS:
                return cached_entry.get("data")

    try:
        # 1. Fetch pending tasks
        pending_tasks = db.query(Task).filter(
            Task.user_id == current_user.id,
            Task.status == "pending"
        ).order_by(Task.due_date.asc().nullslast(), Task.created_at.desc()).all()
        
        priorities = []
        for t in pending_tasks[:4]:
            source_nid = getattr(t, "source_note_id", None)
            priorities.append({
                "id": str(t.id),
                "description": t.description,
                "due_date": t.due_date.isoformat() if t.due_date else None,
                "note_id": str(source_nid) if source_nid else None
            })
            
        # 2. Fetch stale contacts (> 3 days)
        contacts = db.query(Contact).filter(Contact.user_id == current_user.id).all()
        reconnect_nudge = None
        for c in contacts:
            interact = c.last_interaction or c.created_at
            if interact:
                if interact.tzinfo is None:
                    interact = interact.replace(tzinfo=datetime.timezone.utc)
                delta = now - interact
                if delta.days >= 3:
                    reconnect_nudge = {
                        "id": str(c.id),
                        "name": c.name,
                        "role": c.role or "Contact",
                        "context": c.context or "No recent interactions logged",
                        "days_stale": delta.days
                    }
                    break # Pick top stale contact
                    
        # 3. Find a Memory Flashback note (> 2 days old or historic note)
        all_notes = db.query(Note).filter(
            Note.user_id == current_user.id
        ).order_by(Note.created_at.asc()).all()
        
        flashback = None
        if all_notes:
            eligible = []
            for n in all_notes:
                if n.created_at:
                    c_date = n.created_at if n.created_at.tzinfo else n.created_at.replace(tzinfo=datetime.timezone.utc)
                    age_days = (now - c_date).days
                    if age_days >= 2:
                        eligible.append((n, age_days))
            
            if eligible:
                chosen_note, days_ago = eligible[len(eligible) // 2]
                clean_excerpt = chosen_note.summary or (chosen_note.content or "").replace('\n', ' ')[:180]
                if len(chosen_note.content or "") > 180 and not chosen_note.summary:
                    clean_excerpt += "..."
                    
                flashback = {
                    "id": str(chosen_note.id),
                    "title": chosen_note.title or "Untitled Memory",
                    "created_at": chosen_note.created_at.isoformat() if chosen_note.created_at else None,
                    "days_ago": days_ago,
                    "excerpt": clean_excerpt,
                    "tags": [t.strip() for t in chosen_note.tags.split(",") if t.strip()] if chosen_note.tags else []
                }

        # 4. Deterministic default brief
        if priorities and reconnect_nudge:
            headline = f"Focus on {len(priorities)} commitments & reconnect with {reconnect_nudge['name']}"
            focus_summary = f"You have {len(priorities)} pending action items on your radar, and it's been {reconnect_nudge['days_stale']} days since your last note with {reconnect_nudge['name']}."
        elif priorities:
            headline = f"Focus on your top {len(priorities)} pending action items"
            focus_summary = f"You have {len(priorities)} active commitments ready to tackle today."
        elif reconnect_nudge:
            headline = f"Great time to reconnect with {reconnect_nudge['name']}"
            focus_summary = f"No pressing task deadlines right now. Consider checking in with {reconnect_nudge['name']}."
        else:
            headline = "Your mind is clear and up to date"
            focus_summary = "All commitments resolved. Capture fresh thoughts or ideas as they emerge today."

        spark_thoughts = [
            "What is the single most important outcome that would make today a success?",
            "Clarity comes from writing your thoughts down before acting on them.",
            "Small daily consistency compounds into monumental long-term knowledge.",
            "Your second brain works while you rest — review your past reflections to spot new patterns."
        ]
        import random
        spark_thought = random.choice(spark_thoughts)

        # Optional fast LLM enhancement
        try:
            if (priorities or reconnect_nudge) and (settings.GEMINI_API_KEY or settings.GROQ_API_KEY or settings.OPENROUTER_API_KEY):
                kernel = get_kernel()
                context_snippet = f"User name: {user_name}. Top tasks: {[p['description'] for p in priorities]}. Stale contact: {reconnect_nudge['name'] if reconnect_nudge else 'None'}."
                ai_prompt = f"Given this context: {context_snippet}, generate a 1-sentence energizing morning briefing (max 18 words) and a punchy 5-word headline. Format: Headline: <5 words> | Summary: <18 words>"
                ai_res = await kernel.generate_chat_completion([
                    {"role": "system", "content": "You are a thoughtful executive assistant. Be crisp and concise."},
                    {"role": "user", "content": ai_prompt}
                ], temperature=0.5)
                if "Headline:" in ai_res and "Summary:" in ai_res:
                    parts = ai_res.split("|")
                    h = parts[0].replace("Headline:", "").strip()
                    s = parts[1].replace("Summary:", "").strip()
                    if h: headline = h
                    if s: focus_summary = s
        except Exception:
            pass

        result = {
            "greeting": f"Good morning, {user_name}",
            "headline": headline,
            "focus_summary": focus_summary,
            "priorities": priorities,
            "reconnect_nudge": reconnect_nudge,
            "flashback": flashback,
            "spark_thought": spark_thought,
            "timestamp": now.isoformat()
        }
        user_briefing_cache[user_key] = {
            "data": result,
            "timestamp": now
        }
        return result
    except Exception as e:
        print(f"Error formulating daily briefing: {e}")
        return {
            "greeting": f"Good morning, {user_name}",
            "headline": "Welcome to your Cognitive Workspace",
            "focus_summary": "Your memory base is ready. Capture notes or ask questions anytime.",
            "priorities": [],
            "reconnect_nudge": None,
            "flashback": None,
            "spark_thought": "Clarity comes from writing your thoughts down before acting on them.",
            "timestamp": now.isoformat()
        }

@router.post("/transcribe")
async def transcribe_audio(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """
    Transcribes audio speech using Groq Whisper API (whisper-large-v3).
    """
    if not settings.GROQ_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="GROQ_API_KEY is not configured in .env. Please configure it to enable Groq Whisper voice transcription."
        )
    
    audio_bytes = await file.read()
    if not audio_bytes or len(audio_bytes) < 100:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Empty or invalid audio file provided.")
        
    filename = file.filename or "recording.webm"
    content_type = file.content_type or "audio/webm"
    
    async with httpx.AsyncClient(timeout=30.0) as client:
        files = {
            "file": (filename, audio_bytes, content_type)
        }
        data = {
            "model": "whisper-large-v3",
            "response_format": "json"
        }
        headers = {
            "Authorization": f"Bearer {settings.GROQ_API_KEY}"
        }
        try:
            res = await client.post(
                "https://api.groq.com/openai/v1/audio/transcriptions",
                files=files,
                data=data,
                headers=headers
            )
            if res.status_code != 200:
                raise HTTPException(
                    status_code=res.status_code,
                    detail=f"Groq Whisper transcription error ({res.status_code}): {res.text}"
                )
            result = res.json()
            return {"text": result.get("text", "").strip()}
        except httpx.RequestError as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to connect to Groq Whisper service: {e}"
            )
