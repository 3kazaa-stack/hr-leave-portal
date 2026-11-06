#!/usr/bin/env zsh
# Start `agentcore dev` with short-term AWS credentials passed to the container.
# The container can't use the `aws login` session directly, so we export the
# current credentials as env vars. They last ~15 minutes: when they expire,
# stop with Ctrl+C and run this script again.
set -euo pipefail
cd "${0:A:h}"

creds="$(aws configure export-credentials --format env)" || {
  echo "Could not get AWS credentials. Run 'aws login' and try again." >&2
  exit 1
}
eval "$creds"

: "${AWS_ACCESS_KEY_ID:?credentials were not exported}"
expiry="$(aws configure export-credentials --format process | python3 -c 'import json,sys; print(json.load(sys.stdin).get("Expiration","unknown"))')"
echo "AWS credentials exported (expire at $expiry)."

if (( $# == 0 )); then
  set -- --mode browser
fi
exec agentcore dev "$@"
