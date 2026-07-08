#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ANSIBLE_DIR="${SCRIPT_DIR}/ansible"
LOCAL_ANSIBLE_PLAYBOOK="/Users/twinsant/.local/bin/ansible-playbook"

if command -v ansible-playbook >/dev/null 2>&1; then
  ANSIBLE_PLAYBOOK_BIN="$(command -v ansible-playbook)"
elif [[ -x "${LOCAL_ANSIBLE_PLAYBOOK}" ]]; then
  ANSIBLE_PLAYBOOK_BIN="${LOCAL_ANSIBLE_PLAYBOOK}"
else
  echo "ansible-playbook not found. Install Ansible first, then rerun ./ops/deploy-nginx.sh." >&2
  exit 127
fi

exec "${ANSIBLE_PLAYBOOK_BIN}" -i "${ANSIBLE_DIR}/inventory.ini" "${ANSIBLE_DIR}/deploy-nginx.yml" "$@"