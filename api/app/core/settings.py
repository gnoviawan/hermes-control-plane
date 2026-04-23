from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class Settings:
    app_name: str = "Hermes Control Plane API"
    api_prefix: str = "/api"
    hermes_home: Path = Path(os.getenv("HERMES_HOME", "/opt/data")).expanduser()
    hermes_bin: Path = Path(os.getenv("HERMES_BIN", "/opt/hermes/.venv/bin/hermes")).expanduser()
    hermes_root: Path = Path(
        os.getenv(
            "HERMES_ROOT",
            str(Path(os.getenv("HERMES_BIN", "/opt/hermes/.venv/bin/hermes")).expanduser().parents[2]),
        )
    ).expanduser()
    profiles_dir_name: str = "profiles"
    logs_dir_name: str = "logs"
    cron_dir_name: str = "cron"
    skills_snapshot_name: str = ".skills_prompt_snapshot.json"
    profile_name_pattern: str = r"^[a-z0-9][a-z0-9_-]{0,63}$"
    command_timeout_seconds: int = int(os.getenv("HERMES_API_COMMAND_TIMEOUT", "45"))


settings = Settings()
