#!/usr/bin/env python3
"""
CrewAI runner for EstateWise Agentic AI.

Reads JSON from stdin with the shape:
{
  "goal": "...",
  "include": {"planner": true, "analysis": true, "graph": true, "finance": true, "reporter": true},
  "context": {...},
  "preferences": ["..."],
  "hints": ["..."],
  "emphasis": ["..."],
  "mapFocus": "..."
}

Prints structured JSON with sections, timeline, and metadata.
"""
import json
import os
import sys
from typing import Any, Dict, List, Optional


def _read_json_stdin() -> Dict[str, Any]:
    data = sys.stdin.read()
    try:
        return json.loads(data or "{}")
    except Exception:
        return {}


def _safe_print_json(obj: Dict[str, Any]):
    sys.stdout.write(json.dumps(obj, ensure_ascii=False))
    sys.stdout.flush()


def _compose_context(
    preferences: List[str],
    context: Dict[str, Any],
    hints: List[str],
    emphasis: List[str],
    map_focus: Optional[str],
) -> str:
    lines: List[str] = []
    if preferences:
        lines.append("User preferences:")
        lines.extend(f"- {pref}" for pref in preferences)
    if emphasis:
        lines.append("Emphasis:")
        lines.extend(f"- {item}" for item in emphasis)
    if hints:
        lines.append("Execution hints:")
        lines.extend(f"- {hint}" for hint in hints)
    if map_focus:
        lines.append(f"Map focus: {map_focus}")
    if isinstance(context, dict) and context:
        lines.append("Context:")
        for key, value in context.items():
            try:
                serialized = json.dumps(value, ensure_ascii=False)
            except Exception:
                serialized = str(value)
            lines.append(f"- {key}: {serialized}")
    return "\n".join(lines)


def _stringify_output(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, str):
        return value.strip()
    try:
        text = json.dumps(value, ensure_ascii=False)
    except TypeError:
        text = str(value)
    return text.strip()


def _timeline_entry(agent: str, task: str, output: Any) -> Optional[Dict[str, str]]:
    text = _stringify_output(output)
    if not text:
        return None
    return {"agent": agent, "task": task, "output": text}


def _run_crewai(goal: str, payload: Dict[str, Any]) -> Dict[str, Any]:
    try:
        from crewai import Agent, Task, Crew, Process
        try:
            from langchain_openai import ChatOpenAI
        except Exception as err:  # pragma: no cover
            return {"ok": False, "error": f"Missing langchain_openai: {err}"}

        openai_key = os.environ.get("OPENAI_API_KEY")
        if not openai_key:
            return {
                "ok": False,
                "error": "OPENAI_API_KEY is required for CrewAI runtime",
            }

        model = os.environ.get("OPENAI_MODEL", "gpt-4o-mini")
        llm = ChatOpenAI(model=model, temperature=0.2)

        token_usage: Optional[Dict[str, Any]] = None
        callback_ctx = None
        try:
            from langchain_community.callbacks import get_openai_callback  # type: ignore
            callback_ctx = get_openai_callback()
        except Exception:
            try:  # pragma: no cover - legacy fallback
                from langchain.callbacks import get_openai_callback  # type: ignore
                callback_ctx = get_openai_callback()
            except Exception:
                callback_ctx = None

        include = payload.get("include") or {}
        include_planner = bool(include.get("planner", True))
        include_analysis = bool(include.get("analysis", True))
        include_graph = bool(include.get("graph", True))
        include_finance = bool(include.get("finance", True))
        include_reporter = bool(include.get("reporter", True))
        if not any([include_planner, include_analysis, include_graph, include_finance, include_reporter]):
            return {"ok": False, "error": "At least one task must be enabled"}

        context_obj = payload.get("context") or {}
        preferences = payload.get("preferences") or []
        hints = payload.get("hints") or []
        emphasis = payload.get("emphasis") or []
        map_focus = payload.get("mapFocus")

        context_text = _compose_context(
            preferences if isinstance(preferences, list) else [],
            context_obj if isinstance(context_obj, dict) else {},
            hints if isinstance(hints, list) else [],
            emphasis if isinstance(emphasis, list) else [],
            map_focus if isinstance(map_focus, str) else None,
        )
        context_suffix = f"\n\nAdditional context:\n{context_text}" if context_text else ""

        agents: List[Agent] = []
        tasks: List[Task] = []

        planner_task: Optional[Task] = None
        analyst_task: Optional[Task] = None
        graph_task: Optional[Task] = None
        finance_task: Optional[Task] = None
        reporter_task: Optional[Task] = None

        if include_planner:
            planner_agent = Agent(
                role="Planner",
                goal="Draft a concise, tool-grounded plan for real-estate research goals.",
                backstory=(
                    "You break goals into search, analysis, graph, map, and finance tasks."
                    " Prefer deterministic actions over speculation."
                ),
                llm=llm,
                allow_delegation=False,
                verbose=False,
            )
            planner_task = Task(
                description=(
                    f"Plan steps for: {goal}. Break the work into 4-8 actionable steps with rationale."\
                    f"{context_suffix}"
                ),
                agent=planner_agent,
                expected_output="A numbered list of steps with brief justifications.",
            )
            agents.append(planner_agent)
            tasks.append(planner_task)

        if include_analysis:
            analyst_agent = Agent(
                role="Market Analyst",
                goal="Search and summarize matching properties with clear filters and reasoning.",
                backstory="You synthesize tool outputs and provide JSON-friendly summaries.",
                llm=llm,
                allow_delegation=False,
                verbose=False,
            )
            analyst_task = Task(
                description=(
                    "Identify candidate properties that satisfy the goal."
                    " Include filters (beds/baths/price/locations) and cite supporting data."
                    " Structure the output in short JSON-like bullets."\
                    f"{context_suffix}"
                ),
                agent=analyst_agent,
                expected_output="Top matches with filters and rationale in JSON-style bullets.",
            )
            agents.append(analyst_agent)
            tasks.append(analyst_task)

        if include_graph:
            graph_agent = Agent(
                role="Graph Analyst",
                goal="Explain graph relationships, similarities, and Cypher opportunities for the candidates.",
                backstory="You think in terms of zpids, neighborhoods, and similarity edges.",
                llm=llm,
                allow_delegation=False,
                verbose=False,
            )
            graph_task = Task(
                description=(
                    "Highlight graph-based relationships between the leading properties."
                    " Reference potential Cypher queries or similarity edges."\
                    f"{context_suffix}"
                ),
                agent=graph_agent,
                expected_output="1-3 bullets plus an optional Cypher snippet.",
            )
            agents.append(graph_agent)
            tasks.append(graph_task)

        if include_finance:
            finance_agent = Agent(
                role="Finance Analyst",
                goal="Model affordability and mortgage scenarios with transparent assumptions.",
                backstory="You calculate monthly payments, include down payment assumptions, and cite rates.",
                llm=llm,
                allow_delegation=False,
                verbose=False,
            )
            finance_task = Task(
                description=(
                    "Estimate mortgage payments and affordability for the leading property scenario."
                    " Provide rates, down payment assumptions, and monthly breakdown."\
                    f"{context_suffix}"
                ),
                agent=finance_agent,
                expected_output="Monthly payment estimate, assumptions, and notable constraints.",
            )
            agents.append(finance_agent)
            tasks.append(finance_task)

        if include_reporter:
            reporter_agent = Agent(
                role="Reporter",
                goal="Deliver the final EstateWise answer with bullets, links, and clear next steps.",
                backstory="You cite tool-derived facts, note limitations, and keep the answer concise.",
                llm=llm,
                allow_delegation=False,
                verbose=False,
            )
            reporter_task = Task(
                description=(
                    "Compose the final user-facing answer summarizing property options,"
                    " graph insights, finance, and map guidance. Reference concrete numbers."\
                    f"{context_suffix}"
                ),
                agent=reporter_agent,
                expected_output="Concise bullet list, key figures, and a map/link call-to-action.",
            )
            agents.append(reporter_agent)
            tasks.append(reporter_task)

        if not tasks:
            return {"ok": False, "error": "CrewAI runner has no tasks to execute"}

        crew = Crew(
            agents=agents,
            tasks=tasks,
            process=Process.sequential,
            verbose=False,
        )
        if callback_ctx:
            with callback_ctx as cb:
                result = crew.kickoff()
            token_usage = {
                "promptTokens": getattr(cb, "prompt_tokens", None),
                "completionTokens": getattr(cb, "completion_tokens", None),
                "totalTokens": getattr(cb, "total_tokens", None),
            }
        else:
            result = crew.kickoff()

        sections: Dict[str, Optional[str]] = {}
        timeline: List[Dict[str, str]] = []
        artifacts: Dict[str, Optional[str]] = {}

        if planner_task:
            plan_output = _stringify_output(getattr(planner_task, "output", None))
            sections["plan"] = plan_output or None
            artifacts["plan"] = plan_output or None
            entry = _timeline_entry("Planner", "plan", planner_task.output)
            if entry:
                timeline.append(entry)
        if analyst_task:
            analysis_output = _stringify_output(getattr(analyst_task, "output", None))
            sections["analysis"] = analysis_output or None
            artifacts["analysis"] = analysis_output or None
            entry = _timeline_entry("Market Analyst", "analysis", analyst_task.output)
            if entry:
                timeline.append(entry)
        if graph_task:
            graph_output = _stringify_output(getattr(graph_task, "output", None))
            sections["graph"] = graph_output or None
            artifacts["graph"] = graph_output or None
            entry = _timeline_entry("Graph Analyst", "graph", graph_task.output)
            if entry:
                timeline.append(entry)
        if finance_task:
            finance_output = _stringify_output(getattr(finance_task, "output", None))
            sections["finance"] = finance_output or None
            artifacts["finance"] = finance_output or None
            entry = _timeline_entry("Finance Analyst", "finance", finance_task.output)
            if entry:
                timeline.append(entry)
        if reporter_task:
            report_output = _stringify_output(getattr(reporter_task, "output", None))
            sections["report"] = report_output or None
            artifacts["report"] = report_output or None
            entry = _timeline_entry("Reporter", "report", reporter_task.output)
            if entry:
                timeline.append(entry)

        summary = _stringify_output(result)
        if not summary and reporter_task:
            summary = sections.get("report") or ""

        return {
            "ok": True,
            "summary": summary,
            "result": summary,
            "sections": sections,
            "timeline": timeline,
            "artifacts": artifacts,
            "metadata": {
                "include": include,
                "model": model,
                "tokenUsage": token_usage,
                "preferences": preferences,
                "hints": hints,
                "emphasis": emphasis,
                "mapFocus": map_focus,
                "context": context_obj,
            },
        }
    except Exception as exc:  # pragma: no cover
        return {"ok": False, "error": f"CrewAI runtime error: {exc}"}


def main():
    payload = _read_json_stdin()
    goal = payload.get("goal") or ""
    if not goal:
        _safe_print_json({"ok": False, "error": "Missing goal"})
        return
    res = _run_crewai(goal, payload)
    _safe_print_json(res)


if __name__ == "__main__":
    main()
