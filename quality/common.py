"""Definitions shared by run.py and issues.py."""

METRICS = ("cyclomatic_complexity", "nloc", "parameter_count", "token_count")
METRIC_LABELS = {
    "cyclomatic_complexity": "Complexity",
    "nloc": "Lines",
    "parameter_count": "Parameters",
    "token_count": "Tokens",
}
LEVEL_RANK = {"critical": 0, "warning": 1, "info": 2}


class QualityError(Exception):
    """Configuration or tool error (exit code 2)."""