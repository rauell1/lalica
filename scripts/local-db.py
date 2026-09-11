#!/usr/bin/env python3
"""Start a local PostgreSQL server (TCP on 127.0.0.1) for development.

This is a development convenience only. Production uses Neon PostgreSQL.
The data directory lives in /tmp so it is never committed to the repository.
If the sandbox or machine restarts, run this script again and then rerun
`npm run db:migrate` and `npm run db:seed`.

Usage: python3 scripts/local-db.py
Requirements: pip install pgserver (provides the bundled PostgreSQL binaries)
"""

import pathlib
import subprocess
import sys

try:
    from pgserver._commands import POSTGRES_BIN_PATH
except ModuleNotFoundError:
    sys.stderr.write(
        "pgserver is not installed for this Python interpreter.\n"
        "Use the project virtual environment:\n"
        "  /home/user/.venv/bin/python scripts/local-db.py\n"
        "or install it with: pip install pgserver\n"
    )
    sys.exit(1)

BIN = pathlib.Path(POSTGRES_BIN_PATH)
PGDATA = pathlib.Path("/tmp/lalica-pgdata")
PORT = 5432
APP_DB = "lalica"
CONN = f"postgresql://postgres@127.0.0.1:{PORT}/{APP_DB}"


def run(name, *args):
    return subprocess.run(
        [str(BIN / name), *[str(a) for a in args]],
        capture_output=True,
        text=True,
    )


def main() -> None:
    if not (PGDATA / "PG_VERSION").exists():
        print("[local-db] initialising data directory...", flush=True)
        result = run(
            "initdb",
            "-D",
            PGDATA,
            "-U",
            "postgres",
            "-A",
            "trust",
            "--no-locale",
            "-E",
            "UTF8",
        )
        if result.returncode != 0:
            print(f"[local-db] initdb failed: {result.stderr}", file=sys.stderr)
            sys.exit(1)

    ready = run("pg_isready", "-h", "127.0.0.1", "-p", PORT, "-U", "postgres")
    if ready.returncode != 0:
        # Stop any stale instance that may hold the data directory (for
        # example one started in socket-only mode by another tool).
        if (PGDATA / "postmaster.pid").exists():
            run("pg_ctl", "-D", PGDATA, "-m", "fast", "-w", "stop")
        print("[local-db] starting PostgreSQL...", flush=True)
        result = run(
            "pg_ctl",
            "-D",
            PGDATA,
            "-l",
            PGDATA / "log",
            "-o",
            f"-p {PORT} -h 127.0.0.1 -k {PGDATA}",
            "-w",
            "start",
        )
        if result.returncode != 0:
            print(f"[local-db] start failed: {result.stderr}", file=sys.stderr)
            sys.exit(1)

    check = run(
        "psql",
        "-h",
        "127.0.0.1",
        "-p",
        PORT,
        "-U",
        "postgres",
        "-d",
        "postgres",
        "-tAc",
        f"SELECT 1 FROM pg_database WHERE datname='{APP_DB}'",
    )
    if check.stdout.strip() != "1":
        created = run(
            "psql",
            "-h",
            "127.0.0.1",
            "-p",
            PORT,
            "-U",
            "postgres",
            "-d",
            "postgres",
            "-c",
            f"CREATE DATABASE {APP_DB}",
        )
        if created.returncode != 0:
            print(f"[local-db] database create failed: {created.stderr}", file=sys.stderr)
            sys.exit(1)
        print(f"[local-db] created database {APP_DB}", flush=True)

    print(f"[local-db] PostgreSQL is ready: {CONN}", flush=True)
    print(f"[local-db] add DATABASE_URL={CONN} to .env.local to use it.", flush=True)


if __name__ == "__main__":
    main()
