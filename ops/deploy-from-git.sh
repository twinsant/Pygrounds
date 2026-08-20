#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ANSIBLE_DIR="${SCRIPT_DIR}/ansible"
LOCAL_ANSIBLE_PLAYBOOK="/Users/twinsant/.local/bin/ansible-playbook"
REPO_URL=""
TARGET_BRANCH="main"
INSTALL_DEPENDENCIES="true"
PASSTHROUGH_ARGS=()

usage() {
  cat <<'EOF'
Usage:
  ops/deploy-from-git.sh [--repo-url <git_repo_url>] [--branch <name>] [--skip-install] [ansible args...]

Options:
  --repo-url <url>   Remote git repository URL to clone/pull on host t
                     Default: local git remote origin URL
  --branch <name>    Remote git branch to deploy
                     Default: local current branch, fallback to main
  --skip-install     Skip bun install before build
  -h, --help         Show this help message
  其他参数           原样透传给 ansible-playbook，例如 `-e allow_dirty_worktree=true`
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo-url)
      if [[ $# -lt 2 ]]; then
        echo "error: --repo-url requires a value" >&2
        usage
        exit 1
      fi
      REPO_URL="$2"
      shift 2
      ;;
    --branch)
      if [[ $# -lt 2 ]]; then
        echo "error: --branch requires a value" >&2
        usage
        exit 1
      fi
      TARGET_BRANCH="$2"
      shift 2
      ;;
    --skip-install)
      INSTALL_DEPENDENCIES="false"
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      PASSTHROUGH_ARGS+=("$1")
      shift
      ;;
  esac
done

if [[ -z "${REPO_URL}" ]]; then
  REPO_URL="$(git -C "${SCRIPT_DIR}/.." remote get-url origin 2>/dev/null || true)"
fi

if [[ "${TARGET_BRANCH}" == "main" ]]; then
  CURRENT_BRANCH="$(git -C "${SCRIPT_DIR}/.." branch --show-current 2>/dev/null || true)"
  if [[ -n "${CURRENT_BRANCH}" ]]; then
    TARGET_BRANCH="${CURRENT_BRANCH}"
  fi
fi

if [[ -z "${REPO_URL}" ]]; then
  echo "error: repo URL is empty and could not be inferred from local git remote origin" >&2
  usage
  exit 1
fi

if command -v ansible-playbook >/dev/null 2>&1; then
  ANSIBLE_PLAYBOOK_BIN="$(command -v ansible-playbook)"
elif [[ -x "${LOCAL_ANSIBLE_PLAYBOOK}" ]]; then
  ANSIBLE_PLAYBOOK_BIN="${LOCAL_ANSIBLE_PLAYBOOK}"
else
  echo "ansible-playbook not found. Install Ansible first, then rerun ./ops/deploy-from-git.sh." >&2
  exit 127
fi

exec "${ANSIBLE_PLAYBOOK_BIN}" \
  -i "${ANSIBLE_DIR}/inventory.ini" \
  "${ANSIBLE_DIR}/deploy-from-git.yml" \
  -e "repo_url=${REPO_URL}" \
  -e "target_branch=${TARGET_BRANCH}" \
  -e "install_dependencies=${INSTALL_DEPENDENCIES}" \
  "${PASSTHROUGH_ARGS[@]+${PASSTHROUGH_ARGS[@]}}"