#!/usr/bin/env python3
"""Quality gate: runs Lizard (complexity) and Semgrep (best practices) for one target.

    python quality/run.py --target backend

Exit codes: 0 = gate passed, 1 = gate failed (see fail_on in config.yml), 2 = configuration or tool error.
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
import time
from pathlib import Path
from typing import Any, Dict, Iterable, Iterator, List, Optional, Tuple

import lizard
import yaml

METRICS = ("cyclomatic_complexity", "nloc", "parameter_count", "token_count")
METRIC_LABELS = {
    "cyclomatic_complexity": "Complexity",
    "nloc": "Lines",
    "parameter_count": "Parameters",
    "token_count": "Tokens",
}
SEMGREP_LEVELS = {"ERROR": "critical", "WARNING": "warning", "INFO": "info"}
SEMGREP_RANK = {"INFO": 0, "WARNING": 1, "ERROR": 2}
LEVEL_RANK = {"critical": 0, "warning": 1, "info": 2}
LEVEL_ICONS = {"ok": "OK", "warning": "WARNING", "critical": "CRITICAL"}
REMOTE_PREFIXES = ("p/", "r/", "http://", "https://", "auto")

# GitHub shows at most 10 error and 10 warning annotations per step.
MAX_ANNOTATIONS = 10


class QualityError(Exception):
    """Configuration or tool error (exit code 2)."""


# ---------------------------------------------------------------------------
# Lizard
# ---------------------------------------------------------------------------

def neutralize_nullish_and_optional_chaining(tokens: Iterable[str], reader: Any) -> Iterator[str]:
    """Lizard extension: stop `??` and `?.` from being counted as ternary conditions."""
    pending: Optional[str] = None
    for token in tokens:
        if pending is None:
            if token == "?":
                pending = token
            else:
                yield token
            continue
        if token == "?":
            yield "nullish_coalescing"
            pending = None
        elif token == ".":
            yield "optional_chaining"
            pending = None
        else:
            yield pending
            pending = None
            yield token
    if pending is not None:
        yield pending


def build_extensions(ignore_safe_operators: bool) -> List[Any]:
    extensions = list(lizard.get_extensions([]))
    if ignore_safe_operators:
        for index, extension in enumerate(extensions):
            if getattr(extension, "__name__", "") == "condition_counter":
                extensions.insert(index, neutralize_nullish_and_optional_chaining)
                break
    return extensions


def enclosing_function(ranges: Dict[str, List[Tuple[int, int, str]]], file: str, line: int) -> Optional[str]:
    """Name of the innermost named function containing the line, if Lizard analyzed that file."""
    candidates = [(end - start, name) for start, end, name in ranges.get(file, []) if start <= line <= end]
    named = [item for item in candidates if not item[1].startswith("(anonymous)")]
    pool = named or candidates
    return min(pool)[1] if pool else None


def classify(value: float, threshold: float, multiplier: float) -> str:
    return "critical" if value >= threshold * multiplier else "warning"


def run_lizard(target: Dict[str, Any]) -> Dict[str, Any]:
    settings = target.get("lizard", {})
    thresholds = settings.get("thresholds", {})
    multiplier = float(settings.get("critical_multiplier", 1.5))

    results = lizard.analyze(
        target["paths"],
        exclude_pattern=settings.get("exclude") or None,
        exts=build_extensions(bool(settings.get("ignore_nullish_and_optional_chaining", True))),
        lans=settings.get("languages") or None,
        use_gitignore=True,
    )

    files = 0
    functions = 0
    counts = {"critical": 0, "warning": 0}
    max_ccn = 0
    max_nloc = 0
    flagged: List[Dict[str, Any]] = []
    ranges: Dict[str, List[Tuple[int, int, str]]] = {}

    for file_info in results:
        files += 1
        relative_file = os.path.relpath(file_info.filename).replace("\\", "/")
        for function in file_info.function_list:
            functions += 1
            ranges.setdefault(relative_file, []).append((function.start_line, function.end_line, function.name))
            max_ccn = max(max_ccn, function.cyclomatic_complexity)
            max_nloc = max(max_nloc, function.nloc)

            violations = []
            for metric in METRICS:
                threshold = thresholds.get(metric)
                value = getattr(function, metric)
                if threshold is not None and value > threshold:
                    violations.append({
                        "metric": metric,
                        "value": value,
                        "threshold": threshold,
                        "critical_threshold": threshold * multiplier,
                        "level": classify(value, threshold, multiplier),
                    })
            if not violations:
                continue

            level = "critical" if any(v["level"] == "critical" for v in violations) else "warning"
            counts[level] += 1
            flagged.append({
                "file": relative_file,
                "name": function.name,
                "start_line": function.start_line,
                "end_line": function.end_line,
                "level": level,
                "violations": violations,
            })

    flagged.sort(key=lambda f: (LEVEL_RANK[f["level"]], f["file"], f["start_line"]))
    status = "critical" if counts["critical"] else "warning" if counts["warning"] else "ok"
    return {
        "status": status,
        "summary": {
            "files": files,
            "functions": functions,
            "critical": counts["critical"],
            "warnings": counts["warning"],
            "max_cyclomatic_complexity": max_ccn,
            "max_nloc": max_nloc,
        },
        "thresholds": thresholds,
        "critical_multiplier": multiplier,
        "functions": flagged,
        "_ranges": ranges,
    }


# ---------------------------------------------------------------------------
# Semgrep
# ---------------------------------------------------------------------------

def resolve_config(entry: str, rules_dir: Path) -> str:
    value = entry.strip()
    if value.startswith(REMOTE_PREFIXES):
        return value
    for candidate in (rules_dir / value, rules_dir / f"{value}.yml", rules_dir / f"{value}.yaml"):
        if candidate.is_file():
            return str(candidate)
    raise QualityError(f"Semgrep rule pack not found: {entry} (looked in {rules_dir})")


def run_semgrep(target: Dict[str, Any], rules_dir: Path) -> Dict[str, Any]:
    settings = target.get("semgrep", {})
    configs = settings.get("configs") or []
    if not configs:
        raise QualityError("Semgrep needs at least one rule pack in 'configs'.")

    binary = shutil.which("semgrep")
    if not binary:
        raise QualityError("Semgrep is not installed (pip install semgrep).")

    command = [binary, "scan", "--json", "--quiet", "--metrics=off", "--disable-version-check", "--no-rewrite-rule-ids"]
    for config in configs:
        command += ["--config", resolve_config(config, rules_dir)]
    for pattern in settings.get("exclude") or []:
        command += ["--exclude", pattern]
    for rule_id in settings.get("exclude_rules") or []:
        command += ["--exclude-rule", rule_id]
    command += target["paths"]

    env = dict(os.environ, PYTHONUTF8="1", SEMGREP_SEND_METRICS="off")
    completed = subprocess.run(command, capture_output=True, text=True, encoding="utf-8", errors="replace", env=env)
    try:
        data = json.loads(completed.stdout)
    except json.JSONDecodeError as error:
        tail = (completed.stderr or completed.stdout or "no output").strip()[-600:]
        raise QualityError(f"Semgrep failed (exit {completed.returncode}): {tail}") from error

    min_rank = SEMGREP_RANK[str(settings.get("min_severity", "INFO")).upper()]
    findings: List[Dict[str, Any]] = []
    for raw in data.get("results", []):
        extra = raw.get("extra", {})
        severity = str(extra.get("severity", "INFO")).upper()
        if severity not in SEMGREP_RANK or SEMGREP_RANK[severity] < min_rank:
            continue
        findings.append({
            "rule_id": raw.get("check_id", "unknown"),
            "level": SEMGREP_LEVELS[severity],
            "message": " ".join(str(extra.get("message", "")).split()),
            "file": raw.get("path", "").replace("\\", "/"),
            "start_line": raw.get("start", {}).get("line", 0),
            "end_line": raw.get("end", {}).get("line", 0),
        })
    findings.sort(key=lambda f: (LEVEL_RANK[f["level"]], f["file"], f["start_line"]))

    counts = {"critical": 0, "warning": 0, "info": 0}
    rules: Dict[str, Dict[str, Any]] = {}
    for finding in findings:
        counts[finding["level"]] += 1
        rule = rules.setdefault(finding["rule_id"], {"rule_id": finding["rule_id"], "level": finding["level"], "count": 0})
        rule["count"] += 1

    status = "critical" if counts["critical"] else "warning" if counts["warning"] else "ok"
    errors = [
        " ".join(str(e.get("message") or e.get("long_msg") or e.get("short_msg") or e.get("type") or "error").split())[:300]
        for e in data.get("errors", [])
    ]
    return {
        "status": status,
        "semgrep_version": data.get("version", "unknown"),
        "summary": {
            "files_scanned": len(data.get("paths", {}).get("scanned", [])),
            "findings": len(findings),
            "critical": counts["critical"],
            "warnings": counts["warning"],
            "info": counts["info"],
            "rules_triggered": len(rules),
        },
        "rules": sorted(rules.values(), key=lambda r: (LEVEL_RANK[r["level"]], -r["count"], r["rule_id"])),
        "findings": findings,
        "errors": errors,
    }


# ---------------------------------------------------------------------------
# Reporting
# ---------------------------------------------------------------------------

def describe_violation(violation: Dict[str, Any]) -> str:
    """"Lines 85 >= 75" for a critical violation (critical limit), "Lines 60 > 50" for a warning."""
    label = METRIC_LABELS[violation["metric"]]
    if violation["level"] == "critical":
        return f"{label} {violation['value']} >= {violation['critical_threshold']:g}"
    return f"{label} {violation['value']} > {violation['threshold']} (critical at {violation['critical_threshold']:g})"
    # return f"{label} {violation['value']} > {violation['threshold']}"


def cell(text: Any) -> str:
    return str(text).replace("|", "\\|").replace("\n", " ")


def build_markdown(label: str, lizard_result: Dict[str, Any], semgrep_result: Dict[str, Any], gate_failed: bool, fail_on: str) -> str:
    lz = lizard_result["summary"]
    sg = semgrep_result["summary"]
    lines = [
        f"## Code quality: {label}",
        "",
        f"**Gate: {'FAILED' if gate_failed else 'passed'}** (fail_on = {fail_on})",
        "",
        f"### Complexity (Lizard): {LEVEL_ICONS[lizard_result['status']]}",
        "",
        "| Files | Functions | Critical | Warnings | Max complexity | Max lines |",
        "|---:|---:|---:|---:|---:|---:|",
        f"| {lz['files']} | {lz['functions']} | {lz['critical']} | {lz['warnings']} | {lz['max_cyclomatic_complexity']} | {lz['max_nloc']} |",
        "",
    ]
    if lizard_result["functions"]:
        lines += ["| Level | Function | Location | Violations |", "|---|---|---|---|"]
        for fn in lizard_result["functions"][:20]:
            details = ", ".join(describe_violation(v) for v in fn["violations"])
            lines.append(f"| {fn['level']} | `{cell(fn['name'])}` | {cell(fn['file'])}:{fn['start_line']} | {cell(details)} |")
        if len(lizard_result["functions"]) > 20:
            lines.append(f"\n_{len(lizard_result['functions']) - 20} more functions in the JSON artifact._")
        lines.append("")

    lines += [
        f"### Best practices (Semgrep {semgrep_result['semgrep_version']}): {LEVEL_ICONS[semgrep_result['status']]}",
        "",
        "| Files scanned | Findings | Critical | Warnings | Info |",
        "|---:|---:|---:|---:|---:|",
        f"| {sg['files_scanned']} | {sg['findings']} | {sg['critical']} | {sg['warnings']} | {sg['info']} |",
        "",
    ]
    if semgrep_result["rules"]:
        lines += ["| Rule | Level | Findings |", "|---|---|---:|"]
        for rule in semgrep_result["rules"][:15]:
            lines.append(f"| `{rule['rule_id']}` | {rule['level']} | {rule['count']} |")
        lines.append("")
    top = [f for f in semgrep_result["findings"] if f["level"] != "info"][:20]
    if top:
        lines += ["| Level | Rule | Location |", "|---|---|---|"]
        for finding in top:
            lines.append(f"| {finding['level']} | `{finding['rule_id']}` | {cell(finding['file'])}:{finding['start_line']} |")
        lines.append("")
    if semgrep_result["errors"]:
        lines += ["**Semgrep reported errors:** " + cell(semgrep_result["errors"][0]), ""]
    return "\n".join(lines)


def escape_annotation(text: str) -> str:
    return text.replace("%", "%25").replace("\r", "%0D").replace("\n", "%0A")


def collect_items(lizard_result: Dict[str, Any], semgrep_result: Dict[str, Any]) -> List[Dict[str, Any]]:
    """Critical and warning findings of both tools, critical first, in one common shape."""
    items = []
    for fn in lizard_result["functions"]:
        details = ", ".join(describe_violation(v) for v in fn["violations"])
        items.append({
            "level": fn["level"],
            "file": fn["file"],
            "start": fn["start_line"],
            "end": fn["end_line"],
            "title": f"Complexity: {fn['name']}",
            "what": fn["name"],
            "details": details,
        })
    for finding in semgrep_result["findings"]:
        if finding["level"] != "info":
            items.append({
                "level": finding["level"],
                "file": finding["file"],
                "start": finding["start_line"],
                "end": finding["end_line"],
                "title": finding["rule_id"],
                "what": f"{finding['rule_id']} (in {finding['function']})" if finding.get("function") else finding["rule_id"],
                "details": finding["message"],
            })
    items.sort(key=lambda item: (LEVEL_RANK[item["level"]], item["file"], item["start"]))
    return items


def print_findings(items: List[Dict[str, Any]]) -> None:
    """Plain list in the job log: level, file:line, function or rule, and the reason."""
    in_actions = bool(os.getenv("GITHUB_ACTIONS"))
    if in_actions:
        print(f"::group::Findings ({len(items)} critical or warning)")
    for item in items:
        print(f"{item['level'].upper():8} {item['file']}:{item['start']}  {item['what']}  {item['details']}")
    if in_actions:
        print("::endgroup::")


def emit_annotations(items: List[Dict[str, Any]]) -> None:
    """Inline annotations in the pull request: critical as errors, warnings as warnings.

    The job log only displays the message, so it carries the location and the function or rule.
    """
    emitted = {"critical": 0, "warning": 0}
    for item in items:
        if emitted[item["level"]] >= MAX_ANNOTATIONS:
            continue
        emitted[item["level"]] += 1
        command = "error" if item["level"] == "critical" else "warning"
        message = f"{item['file']}:{item['start']} {item['what']} - {item['details']}"
        print(f"::{command} file={item['file']},line={item['start']},endLine={item['end']},title={escape_annotation(item['title'])}::{escape_annotation(message)}")


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def load_config(path: Path) -> Dict[str, Any]:
    if not path.is_file():
        raise QualityError(f"Configuration file not found: {path}")
    with path.open(encoding="utf-8") as handle:
        config = yaml.safe_load(handle) or {}
    if not isinstance(config.get("targets"), dict) or not config["targets"]:
        raise QualityError("The configuration needs a non-empty 'targets' section.")
    return config


def gate_failed(fail_on: str, critical: int, warnings: int) -> bool:
    if fail_on == "critical":
        return critical > 0
    if fail_on == "warning":
        return critical + warnings > 0
    if fail_on == "never":
        return False
    raise QualityError(f"Unknown fail_on value: {fail_on} (use critical, warning or never)")


def main() -> int:
    here = Path(__file__).resolve().parent
    parser = argparse.ArgumentParser(description="Run the quality gate for one target.")
    parser.add_argument("--target", required=True, help="Target name from config.yml (for example backend)")
    parser.add_argument("--config", type=Path, default=here / "config.yml")
    parser.add_argument("--rules", type=Path, default=here / "rules", help="Folder of local Semgrep rule packs")
    parser.add_argument("--output", type=Path, default=Path("quality-results"))
    args = parser.parse_args()

    try:
        config = load_config(args.config)
        targets = config["targets"]
        if args.target not in targets:
            raise QualityError(f"Unknown target '{args.target}'. Available: {', '.join(targets)}")
        target = targets[args.target]

        missing = [path for path in target["paths"] if not Path(path).exists()]
        if missing:
            raise QualityError(f"Path(s) not found (run from the repository root): {', '.join(missing)}")

        started = time.perf_counter()
        lizard_result = run_lizard(target)
        semgrep_result = run_semgrep(target, args.rules)
        ranges = lizard_result.pop("_ranges")
        for finding in semgrep_result["findings"]:
            finding["function"] = enclosing_function(ranges, finding["file"], finding["start_line"])

        critical = lizard_result["summary"]["critical"] + semgrep_result["summary"]["critical"]
        warnings = lizard_result["summary"]["warnings"] + semgrep_result["summary"]["warnings"]
        fail_on = str(config.get("fail_on", "critical"))
        failed = gate_failed(fail_on, critical, warnings)
    except QualityError as error:
        print(f"ERROR: {error}", file=sys.stderr)
        return 2

    label = target.get("label", args.target)
    args.output.mkdir(parents=True, exist_ok=True)
    (args.output / f"{args.target}-lizard.json").write_text(json.dumps(lizard_result, indent=2), encoding="utf-8")
    (args.output / f"{args.target}-semgrep.json").write_text(json.dumps(semgrep_result, indent=2), encoding="utf-8")
    markdown = build_markdown(label, lizard_result, semgrep_result, failed, fail_on)
    (args.output / f"{args.target}-summary.md").write_text(markdown, encoding="utf-8")

    summary_file = os.getenv("GITHUB_STEP_SUMMARY")
    if summary_file:
        with open(summary_file, "a", encoding="utf-8") as handle:
            handle.write(markdown + "\n")

    items = collect_items(lizard_result, semgrep_result)
    print_findings(items)
    if os.getenv("GITHUB_ACTIONS"):
        emit_annotations(items)

    print(f"{label}: {critical} critical, {warnings} warnings "
          f"(complexity {lizard_result['summary']['critical']}/{lizard_result['summary']['warnings']}, "
          f"semgrep {semgrep_result['summary']['critical']}/{semgrep_result['summary']['warnings']}) "
          f"in {time.perf_counter() - started:.1f}s. Gate {'FAILED' if failed else 'passed'}.")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
