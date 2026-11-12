"""GitHub issues for the quality gate: create, update and close issues from the analysis results.

Rules
- critical : one detailed issue per function (complexity) and per rule (Semgrep).
- warning  : off by default (on_warning). One digest issue per target, or one issue each (warning_mode).
- An existing open issue is never duplicated. Only its hidden marker is refreshed when the finding
  changes level or metrics, plus a comment (on_change: comment), so manual edits are kept.
- An issue is closed when its finding disappears, and reopened if it comes back.
- An issue closed by a person is respected: it is not recreated.
"""

import hashlib
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from common import METRIC_LABELS, QualityError

MARKER = re.compile(r"<!-- quality-gate:(?P<fingerprint>.+?) sig:(?P<signature>[0-9a-f]+) -->")
BASE_LABEL = "code-quality"
RESOLVED_LABEL = "quality:resolved"
LABEL_COLORS = {
    BASE_LABEL: "1D76DB",
    "quality:critical": "B60205",
    "quality:warning": "FBCA04",
    "quality:info": "5319E7",
    RESOLVED_LABEL: "0E8A16",
}
TIPS = {
    "cyclomatic_complexity": "Reduce branching: extract special cases into dedicated functions, use early returns or a lookup table instead of nested conditions.",
    "nloc": "Split the function into smaller functions or private methods with a single responsibility.",
    "parameter_count": "Group related parameters into an object or a DTO.",
    "token_count": "Simplify expressions, name intermediate values and spread the logic over several functions.",
}
DEFAULTS: Dict[str, Any] = {
    "on_critical": True,        # create issues for critical findings
    "on_warning": False,        # create issues for warnings (see warning_mode)
    "on_info": False,           # create issues for information findings (Semgrep only)
    "warning_mode": "digest",   # digest: one issue per target | individual: one issue per finding
    "on_change": "comment",     # comment | update | ignore, when an existing issue changes
    "branch": "main",           # in GitHub Actions, only this branch synchronises issues
    "max_per_run": 20,          # safety limit for the issues created in one run
    "close_resolved": True,     # close the issues whose finding has disappeared
    "reopen_resolved": True,    # reopen an issue closed by the quality gate when the finding returns
}
MAX_TABLE_ROWS = 100
MAX_OCCURRENCES = 30


class GitHubError(QualityError):
    def __init__(self, status: int, message: str) -> None:
        super().__init__(message)
        self.status = status


# ---------------------------------------------------------------------------
# GitHub API
# ---------------------------------------------------------------------------

class GitHubClient:
    """Minimal GitHub REST client (standard library only)."""

    def __init__(self, repo: str, token: str, api_url: str) -> None:
        self.repo = repo
        self.token = token
        self.api_url = api_url.rstrip("/")

    def request(self, method: str, path: str, body: Optional[Dict[str, Any]] = None) -> Any:
        data = json.dumps(body).encode("utf-8") if body is not None else None
        request = urllib.request.Request(f"{self.api_url}{path}", data=data, method=method)
        request.add_header("Authorization", f"Bearer {self.token}")
        request.add_header("Accept", "application/vnd.github+json")
        request.add_header("X-GitHub-Api-Version", "2022-11-28")
        request.add_header("User-Agent", "quality-gate")
        if data is not None:
            request.add_header("Content-Type", "application/json")
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                payload = response.read()
        except urllib.error.HTTPError as error:
            detail = error.read().decode("utf-8", errors="replace")[:300]
            hints = {
                403: "the token cannot write issues (workflow permission 'issues: write')",
                404: "repository not found or token without access",
                410: "issues are disabled on this repository (Settings > Features > Issues)",
            }
            hint = f" ({hints[error.code]})" if error.code in hints else ""
            raise GitHubError(error.code, f"GitHub API {error.code} on {method} {path}{hint}: {detail}") from error
        return json.loads(payload) if payload else None

    def list_issues(self, label: str) -> List[Dict[str, Any]]:
        """Open and closed issues carrying the label (pull requests excluded)."""
        issues: List[Dict[str, Any]] = []
        page = 1
        while True:
            batch = self.request("GET", f"/repos/{self.repo}/issues?state=all&labels={urllib.parse.quote(label)}&per_page=100&page={page}")
            issues += [item for item in batch if "pull_request" not in item]
            if len(batch) < 100:
                return issues
            page += 1

    def ensure_label(self, name: str) -> None:
        try:
            self.request("POST", f"/repos/{self.repo}/labels", {"name": name, "color": LABEL_COLORS.get(name, "EDEDED")})
        except GitHubError as error:
            if error.status != 422:  # 422: the label already exists
                raise

    def create_issue(self, title: str, body: str, labels: List[str]) -> Dict[str, Any]:
        return self.request("POST", f"/repos/{self.repo}/issues", {"title": title, "body": body, "labels": labels})

    def update_issue(self, number: int, fields: Dict[str, Any]) -> None:
        self.request("PATCH", f"/repos/{self.repo}/issues/{number}", fields)

    def comment(self, number: int, body: str) -> None:
        self.request("POST", f"/repos/{self.repo}/issues/{number}/comments", {"body": body})

    def add_labels(self, number: int, labels: List[str]) -> None:
        self.request("POST", f"/repos/{self.repo}/issues/{number}/labels", {"labels": labels})

    def remove_label(self, number: int, label: str) -> None:
        try:
            self.request("DELETE", f"/repos/{self.repo}/issues/{number}/labels/{urllib.parse.quote(label)}")
        except GitHubError as error:
            if error.status != 404:
                raise


# ---------------------------------------------------------------------------
# Content
# ---------------------------------------------------------------------------

def short_hash(*parts: Any) -> str:
    return hashlib.sha1(json.dumps(parts, sort_keys=True, default=str).encode("utf-8")).hexdigest()[:10]


def run_context(repo: Optional[str]) -> Dict[str, str]:
    sha = os.getenv("GITHUB_SHA", "")
    return {
        "repo": repo or "",
        "sha": sha,
        "short_sha": sha[:7],
        "ref": os.getenv("GITHUB_REF_NAME", ""),
        "server": os.getenv("GITHUB_SERVER_URL", "https://github.com").rstrip("/"),
        "date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
    }


def code_link(ctx: Dict[str, str], file: str, start: int, end: int) -> str:
    if not ctx["repo"] or not ctx["sha"]:
        return ""
    return f"{ctx['server']}/{ctx['repo']}/blob/{ctx['sha']}/{file}#L{start}-L{end}"


def location(ctx: Dict[str, str], file: str, start: int, end: int) -> str:
    link = code_link(ctx, file, start, end)
    label = f"{file}:{start}" if start == end else f"{file}:{start}-{end}"
    return f"[`{label}`]({link})" if link else f"`{label}`"


def detected_text(ctx: Dict[str, str]) -> str:
    if ctx["sha"] and ctx["repo"]:
        return f"`{ctx['ref']}` at [{ctx['short_sha']}]({ctx['server']}/{ctx['repo']}/commit/{ctx['sha']}) on {ctx['date']}"
    return f"local run on {ctx['date']}"


def metric_level(value: float, threshold: Optional[float], multiplier: float) -> str:
    if threshold is None or value <= threshold:
        return "ok"
    return "critical" if value >= threshold * multiplier else "warning"


def metric_table(fn: Dict[str, Any], thresholds: Dict[str, Any], multiplier: float, only_violations: bool = False) -> List[str]:
    rows = ["| Metric | Value | Threshold | Critical from | Status |", "|---|---:|---:|---:|---|"]
    for metric, label in METRIC_LABELS.items():
        value = fn["metrics"][metric]
        threshold = thresholds.get(metric)
        level = metric_level(value, threshold, multiplier)
        if only_violations and level == "ok":
            continue
        if threshold is None:
            rows.append(f"| {label} | {value} | not checked | - | - |")
            continue
        critical_at = threshold * multiplier
        over = f"+{value - threshold:g} over the threshold"
        status = {"ok": "OK", "warning": f"warning ({over})", "critical": f"**CRITICAL** ({over})"}[level]
        rows.append(f"| {label} | {value} | {threshold} | {critical_at:g} | {status} |")
    return rows


def critical_reasons(fn: Dict[str, Any]) -> List[str]:
    return [v for v in fn["violations"] if v["level"] == "critical"]


def function_candidate(
    target: str, label: str, fn: Dict[str, Any], lizard_result: Dict[str, Any], ctx: Dict[str, str]
) -> Dict[str, Any]:
    thresholds = lizard_result["thresholds"]
    multiplier = lizard_result["critical_multiplier"]
    anonymous = fn["name"].startswith("(anonymous)")
    fingerprint = "|".join(["lizard", target, fn["file"], fn["name"]] + ([str(fn["start_line"])] if anonymous else []))
    signature = short_hash(fn["level"], sorted((v["metric"], v["level"]) for v in fn["violations"]))
    total_lines = fn["end_line"] - fn["start_line"] + 1
    reasons = [METRIC_LABELS[v["metric"]] for v in fn["violations"] if v["level"] == fn["level"]]

    if fn["level"] == "critical":
        why = "; ".join(f"{METRIC_LABELS[v['metric']]} {v['value']} >= {v['critical_threshold']:g}" for v in critical_reasons(fn))
        tips = "\n".join(f"- {TIPS[v['metric']]}" for v in fn["violations"])
        body = "\n".join([
            f"## CRITICAL: `{fn['name']}`",
            "",
            "| | |",
            "|---|---|",
            f"| **Function** | `{fn['name']}` |",
            f"| **File** | `{fn['file']}` |",
            f"| **Lines** | {location(ctx, fn['file'], fn['start_line'], fn['end_line'])} ({total_lines} lines including comments) |",
            f"| **Target** | {label} |",
            f"| **Detected** | {detected_text(ctx)} |",
            "",
            "### Metrics",
            *metric_table(fn, thresholds, multiplier),
            "",
            "### Why it is critical",
            f"A function is critical when a metric reaches its threshold x {multiplier:g}. Here: {why}.",
            "",
            "### Suggested approach",
            tips,
            "",
            "### Definition of done",
            "- [ ] Every metric is below its critical limit (ideally below its threshold)",
            "- [ ] The quality gate runs again on the main branch: this issue then closes by itself",
        ])
        title = f"[critical] {fn['name']} ({fn['file']}) - {', '.join(reasons)}"
    else:
        body = "\n".join([
            f"**Level:** WARNING (recommended improvement, not mandatory)  ",
            f"**Function:** `{fn['name']}`  ",
            f"**Location:** {location(ctx, fn['file'], fn['start_line'], fn['end_line'])}  ",
            f"**Detected:** {detected_text(ctx)}",
            "",
            *metric_table(fn, thresholds, multiplier, only_violations=True),
        ])
        title = f"[warning] {fn['name']} ({fn['file']}) - {', '.join(reasons)}"

    update = "\n".join([
        f"**Update:** now **{fn['level'].upper()}** ({detected_text(ctx)})",
        "",
        *metric_table(fn, thresholds, multiplier),
    ])
    return {
        "fingerprint": fingerprint, "signature": signature, "level": fn["level"], "title": title[:250],
        "body": body, "update_comment": update, "digest_line": None, "kind": "lizard", "fn": fn,
    }


def fence_language(file: str) -> str:
    return os.path.splitext(file)[1].lstrip(".")


def rule_candidate(
    target: str, label: str, rule_id: str, findings: List[Dict[str, Any]], ctx: Dict[str, str]
) -> Dict[str, Any]:
    level = findings[0]["level"]
    per_file: Dict[str, int] = {}
    for finding in findings:
        per_file[finding["file"]] = per_file.get(finding["file"], 0) + 1
    signature = short_hash(level, sorted(per_file.items()))
    message = findings[0]["message"]

    if level == "critical":
        occurrences: List[str] = []
        for index, finding in enumerate(findings[:MAX_OCCURRENCES], start=1):
            where = location(ctx, finding["file"], finding["start_line"], finding["end_line"])
            function = f" in `{finding['function']}`" if finding.get("function") else ""
            occurrences += [f"#### {index}. {where}{function}"]
            if finding.get("snippet"):
                occurrences += ["", f"```{fence_language(finding['file'])}", finding["snippet"], "```"]
            occurrences.append("")
        if len(findings) > MAX_OCCURRENCES:
            occurrences.append(f"... and {len(findings) - MAX_OCCURRENCES} more occurrences.")
        body = "\n".join([
            f"## CRITICAL: `{rule_id}`",
            "",
            "| | |",
            "|---|---|",
            f"| **Rule** | `{rule_id}` |",
            f"| **Occurrences** | {len(findings)} in {len(per_file)} file(s) |",
            f"| **Target** | {label} |",
            f"| **Detected** | {detected_text(ctx)} |",
            "",
            "### What is wrong",
            message,
            "",
            "### Occurrences",
            *occurrences,
            "### Definition of done",
            "- [ ] Every occurrence is fixed (or the rule is deliberately excluded in quality/config.yml)",
            "- [ ] The quality gate runs again on the main branch: this issue then closes by itself",
        ])
    else:
        lines = [f"- {location(ctx, f['file'], f['start_line'], f['end_line'])}" + (f" in `{f['function']}`" if f.get("function") else "") for f in findings[:MAX_OCCURRENCES]]
        if len(findings) > MAX_OCCURRENCES:
            lines.append(f"- ... and {len(findings) - MAX_OCCURRENCES} more")
        body = "\n".join([
            f"**Level:** {level.upper()} (recommended improvement, not mandatory)  ",
            f"**Rule:** `{rule_id}`  ",
            f"**Occurrences:** {len(findings)}  ",
            f"**Detected:** {detected_text(ctx)}",
            "",
            message,
            "",
            *lines,
        ])

    update = f"**Update:** `{rule_id}` is now **{level.upper()}** with {len(findings)} occurrence(s) in {len(per_file)} file(s) ({detected_text(ctx)})."
    return {
        "fingerprint": f"semgrep|{target}|{rule_id}", "signature": signature, "level": level,
        "title": f"[{level}] {rule_id}: {len(findings)} occurrence(s) ({target})"[:250],
        "body": body, "update_comment": update, "kind": "semgrep", "rule_id": rule_id, "findings": findings,
    }


def digest_candidate(target: str, label: str, candidates: List[Dict[str, Any]], ctx: Dict[str, str]) -> Dict[str, Any]:
    """One issue listing every warning of the target. It is bot-owned and rewritten when it changes."""
    functions = [c for c in candidates if c["kind"] == "lizard"]
    rules = [c for c in candidates if c["kind"] == "semgrep"]
    lines = [
        f"## Warnings: {label}",
        "",
        "Recommended improvements, not mandatory fixes: they make the code cleaner and easier to maintain.",
        "This issue is maintained by the quality gate and rewritten when the list changes.",
        f"Last update: {detected_text(ctx)}",
        "",
    ]
    if functions:
        lines += [f"### Complexity ({len(functions)} functions)", "", "| Function | Location | Violations |", "|---|---|---|"]
        for candidate in functions[:MAX_TABLE_ROWS]:
            fn = candidate["fn"]
            details = ", ".join(f"{METRIC_LABELS[v['metric']]} {v['value']} > {v['threshold']}" for v in fn["violations"])
            lines.append(f"| `{fn['name']}` | {location(ctx, fn['file'], fn['start_line'], fn['end_line'])} | {details} |")
        lines.append("")
    if rules:
        lines += [f"### Best practices ({len(rules)} rules)", "", "| Rule | Level | Occurrences | First locations |", "|---|---|---:|---|"]
        for candidate in rules[:MAX_TABLE_ROWS]:
            findings = candidate["findings"]
            first = ", ".join(location(ctx, f["file"], f["start_line"], f["end_line"]) for f in findings[:3])
            lines.append(f"| `{candidate['rule_id']}` | {candidate['level']} | {len(findings)} | {first} |")
        lines.append("")
    signature = short_hash(sorted((c["fingerprint"], c["level"]) for c in candidates))
    return {
        "fingerprint": f"digest|{target}", "signature": signature, "level": "warning",
        "title": f"[warning] Code quality warnings: {label} ({len(candidates)})"[:250],
        "body": "\n".join(lines), "update_comment": "", "kind": "digest",
    }


def build_candidates(
    target: str, label: str, lizard_result: Dict[str, Any], semgrep_result: Dict[str, Any],
    settings: Dict[str, Any], ctx: Dict[str, str],
) -> List[Dict[str, Any]]:
    wanted = {level for level, key in (("critical", "on_critical"), ("warning", "on_warning"), ("info", "on_info")) if settings[key]}

    items = [function_candidate(target, label, fn, lizard_result, ctx) for fn in lizard_result["functions"] if fn["level"] in wanted]
    grouped: Dict[str, List[Dict[str, Any]]] = {}
    for finding in semgrep_result["findings"]:
        if finding["level"] in wanted:
            grouped.setdefault(finding["rule_id"], []).append(finding)
    items += [rule_candidate(target, label, rule_id, findings, ctx) for rule_id, findings in grouped.items()]

    critical = [c for c in items if c["level"] == "critical"]
    others = [c for c in items if c["level"] != "critical"]
    if others and settings["warning_mode"] == "digest":
        return critical + [digest_candidate(target, label, others, ctx)]
    return critical + others


def render_body(candidate: Dict[str, Any]) -> str:
    marker = f"<!-- quality-gate:{candidate['fingerprint']} sig:{candidate['signature']} -->"
    footer = "_Created by the quality gate. Closed automatically once the finding disappears._"
    return "\n".join([candidate["body"], "", footer, marker])


# ---------------------------------------------------------------------------
# Synchronisation
# ---------------------------------------------------------------------------

def read_settings(raw: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    settings = {**DEFAULTS, **(raw or {})}
    override = os.getenv("QUALITY_ISSUE_ON_WARNING", "").strip().lower()
    if override:
        settings["on_warning"] = override in ("1", "true", "yes", "on")
    if settings["warning_mode"] not in ("digest", "individual"):
        raise QualityError("issues.warning_mode must be 'digest' or 'individual'.")
    if settings["on_change"] not in ("comment", "update", "ignore"):
        raise QualityError("issues.on_change must be 'comment', 'update' or 'ignore'.")
    return settings


def label_names(issue: Dict[str, Any]) -> List[str]:
    return [item["name"] if isinstance(item, dict) else str(item) for item in issue.get("labels", [])]


def sync_issues(
    target: str, candidates: List[Dict[str, Any]], settings: Dict[str, Any], repo: Optional[str], dry_run: bool
) -> None:
    token = os.getenv("GITHUB_TOKEN") or os.getenv("GH_TOKEN")
    api_url = os.getenv("GITHUB_API_URL", "https://api.github.com")
    delay = float(os.getenv("QUALITY_ISSUE_DELAY", "1"))
    prefix = "would " if dry_run else ""

    client: Optional[GitHubClient] = None
    open_issues: Dict[str, Dict[str, Any]] = {}
    closed_issues: Dict[str, Dict[str, Any]] = {}
    if repo and token:
        client = GitHubClient(repo, token, api_url)
        for issue in sorted(client.list_issues(BASE_LABEL), key=lambda item: item["number"]):
            match = MARKER.search(issue.get("body") or "")
            if not match or match.group("fingerprint").split("|")[1:2] != [target]:
                continue
            record = {"number": issue["number"], "signature": match.group("signature"), "body": issue.get("body") or "", "labels": label_names(issue)}
            (open_issues if issue.get("state") == "open" else closed_issues)[match.group("fingerprint")] = record
    elif not dry_run:
        raise QualityError("Issue sync needs GITHUB_TOKEN and a repository (GITHUB_REPOSITORY or --repo).")

    counts = {"created": 0, "commented": 0, "updated": 0, "closed": 0, "reopened": 0, "kept_closed": 0, "not_created": 0}
    current = {candidate["fingerprint"] for candidate in candidates}

    def write(action) -> None:  # runs a GitHub write unless this is a dry run
        if client is not None and not dry_run:
            action(client)

    for candidate in candidates:
        fingerprint = candidate["fingerprint"]
        labels = [BASE_LABEL, f"quality:{candidate['level']}"]
        existing = open_issues.get(fingerprint)

        if existing is not None:
            if existing["signature"] == candidate["signature"]:
                continue  # nothing changed: the issue is left untouched
            mode = "update" if candidate["kind"] == "digest" else settings["on_change"]
            if mode == "ignore":
                continue
            if mode == "update":
                counts["updated"] += 1
                print(f"issue: {prefix}update #{existing['number']} {candidate['title']}")
                write(lambda c: c.update_issue(existing["number"], {"title": candidate["title"], "body": render_body(candidate)}))
            else:
                counts["commented"] += 1
                print(f"issue: {prefix}comment #{existing['number']} {candidate['title']}")
                marker = f"<!-- quality-gate:{fingerprint} sig:{candidate['signature']} -->"
                new_body = MARKER.sub(lambda _: marker, existing["body"])  # only the hidden marker changes
                write(lambda c: (c.comment(existing["number"], candidate["update_comment"]), c.update_issue(existing["number"], {"body": new_body})))
            continue

        previous = closed_issues.get(fingerprint)
        if previous is not None:
            if RESOLVED_LABEL in previous["labels"] and settings["reopen_resolved"]:
                counts["reopened"] += 1
                print(f"issue: {prefix}reopen #{previous['number']} {candidate['title']}")

                def reopen(c: GitHubClient, issue: Dict[str, Any] = previous, item: Dict[str, Any] = candidate) -> None:
                    c.comment(issue["number"], f"Reported again by the quality gate.\n\n{item['update_comment'] or item['body']}")
                    c.update_issue(issue["number"], {"state": "open"})
                    c.remove_label(issue["number"], RESOLVED_LABEL)

                write(reopen)
            else:
                counts["kept_closed"] += 1
                print(f"issue: kept closed #{previous['number']} (closed manually) {candidate['title']}")
            continue

        if counts["created"] >= int(settings["max_per_run"]):
            counts["not_created"] += 1
            continue
        counts["created"] += 1
        print(f"issue: {prefix}create {candidate['title']}")

        def create(c: GitHubClient, item: Dict[str, Any] = candidate, item_labels: List[str] = labels) -> None:
            for name in item_labels:
                c.ensure_label(name)
            c.create_issue(item["title"], render_body(item), item_labels)
            time.sleep(delay)  # stay below GitHub's secondary rate limit

        write(create)

    if settings["close_resolved"]:
        for fingerprint, issue in open_issues.items():
            if fingerprint in current:
                continue
            counts["closed"] += 1
            print(f"issue: {prefix}close #{issue['number']} (resolved) {fingerprint}")

            def close(c: GitHubClient, item: Dict[str, Any] = issue) -> None:
                c.ensure_label(RESOLVED_LABEL)
                c.comment(item["number"], "No longer reported by the quality gate: closing this issue.")
                c.add_labels(item["number"], [RESOLVED_LABEL])
                c.update_issue(item["number"], {"state": "closed", "state_reason": "completed"})

            write(close)

    summary = ", ".join(f"{value} {name.replace('_', ' ')}" for name, value in counts.items())
    print(f"issues: {summary} (max_per_run={settings['max_per_run']}).")


def run_issue_sync(
    target: str, label: str, raw_settings: Optional[Dict[str, Any]], lizard_result: Dict[str, Any],
    semgrep_result: Dict[str, Any], repo: Optional[str], dry_run: bool,
) -> None:
    """Best effort: a GitHub error is reported as a warning and never changes the gate result."""
    in_actions = bool(os.getenv("GITHUB_ACTIONS"))
    try:
        settings = read_settings(raw_settings)
        branch = settings["branch"]
        if branch and in_actions and os.getenv("GITHUB_REF_NAME") != branch:
            print(f"issues: skipped (they are only synchronised from '{branch}', this is '{os.getenv('GITHUB_REF_NAME')}').")
            return
        candidates = build_candidates(target, label, lizard_result, semgrep_result, settings, run_context(repo))
        sync_issues(target, candidates, settings, repo, dry_run)
    except (QualityError, urllib.error.URLError, OSError) as error:
        message = f"Issue sync failed: {error}"
        print(f"::warning::{message}" if in_actions else f"WARNING: {message}", file=sys.stderr)