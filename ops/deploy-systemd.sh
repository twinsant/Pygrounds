#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ANSIBLE_DIR="${SCRIPT_DIR}/ansible"
LOCAL_ANSIBLE_PLAYBOOK="/Users/twinsant/.local/bin/ansible-playbook"
BUN_ARCHIVE_LOCAL_PATH="${SCRIPT_DIR}/cache/bun-linux-x64.zip"
EXTRA_ARGS=()

if command -v ansible-playbook >/dev/null 2>&1; then
  ANSIBLE_PLAYBOOK_BIN="$(command -v ansible-playbook)"
elif [[ -x "${LOCAL_ANSIBLE_PLAYBOOK}" ]]; then
  ANSIBLE_PLAYBOOK_BIN="${LOCAL_ANSIBLE_PLAYBOOK}"
else
  echo "ansible-playbook not found. Install Ansible first, then rerun ./ops/deploy-systemd.sh." >&2
  exit 127
fi

if [[ -f "${BUN_ARCHIVE_LOCAL_PATH}" ]]; then
  EXTRA_ARGS+=( -e "bun_archive_local_path=${BUN_ARCHIVE_LOCAL_PATH}" )
fi

exec "${ANSIBLE_PLAYBOOK_BIN}" -i "${ANSIBLE_DIR}/inventory.ini" "${ANSIBLE_DIR}/deploy-systemd.yml" "${EXTRA_ARGS[@]}" "$@"