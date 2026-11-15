#!/usr/bin/env bash
# One headless Claude Code run of the motion-kit skill, the way a user would ask for a video.
# For maintainers testing the skill; users never run this.
#
#   dev/run-kit-trial.sh <run-dir> <fixture-dir> <prompt-file> [model] [max-turns]
#
# <run-dir>/work/ gets a copy of the fixture folder (the user's files) and becomes the working
# directory; <run-dir>/plugin/ gets a copy of this plugin, so a run can never change the source
# kit. The event stream goes to <run-dir>/stream.jsonl and its last result line to
# <run-dir>/result.json (one invocation, so total_cost_usd is this run's own cost).
#
# As in run-trial.sh: no user or project settings, no MCP server but the stand-in for the
# person at the permission prompt (dev/learner-mcp.mjs: no to anything the skill does not ask
# for), only this plugin, and a HyperFrames settings folder of its own, starting with
# telemetry on, so the run shows whether the kit turned it off and this machine's own setting
# is untouched. HYPERFRAMES_NO_TELEMETRY=1 is a safety net so a trial sends nothing.
set -euo pipefail
run_dir="$1"; fixture="$2"; prompt_file="$3"; model="${4:-claude-haiku-5-5}"; turns="${5:-60}"
here="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$run_dir/work" "$run_dir/plugin" "$run_dir/hf-config"
printf '{"telemetryEnabled": true, "telemetryNoticeShown": true}\n' > "$run_dir/hf-config/config.json"
export HYPERFRAMES_CONFIG_DIR="$run_dir/hf-config" HYPERFRAMES_NO_TELEMETRY=1
cp -R "$fixture"/. "$run_dir/work/"
cp -R "$here/.claude-plugin" "$here/skills" "$run_dir/plugin/"
cd "$run_dir/work"
mcp="{\"mcpServers\":{\"learner\":{\"type\":\"stdio\",\"command\":\"node\",\"args\":[\"$here/dev/learner-mcp.mjs\"],\"env\":{\"LEARNER_LOG\":\"$run_dir/prompts.jsonl\",\"LEARNER_CWD\":\"$run_dir/work\"}}}}"
start=$(date +%s)
claude -p "$(cat "$prompt_file")" \
  --model "$model" \
  --output-format stream-json --verbose \
  --restricted \
  --strict-mcp-config --mcp-config "$mcp" \
  --permission-prompt-tool mcp__learner__approve \
  --plugin-dir "$run_dir/plugin" \
  --add-dir "$run_dir/plugin/skills/motion-kit" \
  --tools "Bash,Read,Write,Edit,Glob,Grep,Skill" \
  --allowedTools "Bash(npx hyperframes@0.9.51:*)" "Bash(node:*)" "Bash(ls:*)" "Read" "Write" "Edit" "Glob" "Grep" "Skill" \
  --max-turns "$turns" \
  --no-session-persistence \
  > "$run_dir/stream.jsonl" 2> "$run_dir/stderr.log" || echo "claude exited $?" >> "$run_dir/stderr.log"
grep '"type":"result"' "$run_dir/stream.jsonl" | tail -1 > "$run_dir/result.json" || true
echo "seconds=$(( $(date +%s) - start ))" > "$run_dir/time.txt"
