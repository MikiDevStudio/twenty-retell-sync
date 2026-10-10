"""headersHelper for .mcp.json: prints a Bearer auth header as JSON.
Usage: python scripts/mcp_headers.py <ENV_VAR_NAME>

${VAR} in .mcp.json never reads .env files, so the key is read here.
Shared ~/.claude/.env first, project .env overrides.
"""
import json
import sys
from pathlib import Path


def read_env(path):
    out = {}
    if path.is_file():
        for line in path.read_text(encoding="utf-8").splitlines():
            if "=" in line and not line.lstrip().startswith("#"):
                k, v = line.split("=", 1)
                out[k.strip()] = v.strip().strip("\r\"'")
    return out


env = {**read_env(Path.home() / ".claude" / ".env"), **read_env(Path(".env"))}
print(json.dumps({"Authorization": f"Bearer {env[sys.argv[1]]}"}))
