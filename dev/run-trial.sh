#!/usr/bin/env bash
# One headless Claude Code run on Haiku 5.5, the way a learner would ask for the video.
# For maintainers testing the skill; learners never run this.
#
#   dev/run-trial.sh <run-dir> <fixture-page-dir> <prompt-file> [max-turns]
#
# <run-dir>/page/ gets a copy of the fixture page and becomes the working directory.
# <run-dir>/plugin/ gets a copy of this plugin, so a run can never change the source template.
# The event stream goes to <run-dir>/stream.jsonl; its last line, the same result object
# --output-format json prints (usage, total_cost_usd), to <run-dir>/result.json.
#
# Kept close to a fresh learner machine:
#   --restricted           no user, project or local settings files (no personal CLAUDE.md,
#                          skills, hooks); file tools stay in the working directories
#   --strict-mcp-config    no MCP server but the learner stand-in (dev/learner-mcp.mjs)
#   --plugin-dir           only this plugin
#   --tools/--allowedTools only the tools and commands the skill needs
# A learner answers permission prompts by hand; headless, dev/learner-mcp.mjs answers them as
# the guide tells a learner to (yes to copying the template into ./video, no to anything else)
# and logs each one to <run-dir>/prompts.jsonl. The skill folder is added with --add-dir so the
# template can be read.
#
# HyperFrames keeps its settings in ~/.hyperframes. The skill runs `telemetry disable`, which would
# change this machine's own setting, so each run gets its own settings folder,
# <run-dir>/hf-config, starting with telemetry on as on a fresh machine; afterwards its config.json
# shows whether the run turned it off (summarize.mjs reports it). HyperFrames copies only its
# config and state files into a new folder, never ~/.hyperframes/credentials, and the browser stays
# in ~/.cache/puppeteer. HYPERFRAMES_NO_TELEMETRY=1 is a safety net, so a trial run sends nothing
# even if a command ran before the skill's telemetry step; it does not stop that step's write.
set -euo pipefail
run_dir="$1"; fixture="$2"; prompt_file="$3"; turns="${4:-60}"
here="$(cd "$(dirname "$0")/.." && pwd)"
mkdir -p "$run_dir/page" "$run_dir/plugin" "$run_dir/hf-config"
printf '{"telemetryEnabled": true, "telemetryNoticeShown": true}\n' > "$run_dir/hf-config/config.json"
export HYPERFRAMES_CONFIG_DIR="$run_dir/hf-config" HYPERFRAMES_NO_TELEMETRY=1
cp -R "$fixture"/. "$run_dir/page/"
cp -R "$here/.claude-plugin" "$here/skills" "$run_dir/plugin/"
cd "$run_dir/page"
mcp="{\"mcpServers\":{\"learner\":{\"type\":\"stdio\",\"command\":\"node\",\"args\":[\"$here/dev/learner-mcp.mjs\"],\"env\":{\"LEARNER_LOG\":\"$run_dir/prompts.jsonl\",\"LEARNER_CWD\":\"$run_dir/page\"}}}}"
start=$(date +%s)
claude -p "$(cat "$prompt_file")" \
  --model claude-haiku-5-5 \
  --output-format stream-json --verbose \
  --restricted \
  --strict-mcp-config --mcp-config "$mcp" \
  --permission-prompt-tool mcp__learner__approve \
  --plugin-dir "$run_dir/plugin" \
  --add-dir "$run_dir/plugin/skills/video-promo" \
  --tools "Bash,Read,Write,Edit,Glob,Grep,Skill" \
  --allowedTools "Bash(npx hyperframes@0.9.51:*)" "Bash(cp:*)" "Bash(cp -R:*)" "Bash(ls:*)" "Bash(mkdir:*)" "Bash(node:*)" "Read" "Write" "Edit" "Glob" "Grep" "Skill" \
  --max-turns "$turns" \
  --no-session-persistence \
  > "$run_dir/stream.jsonl" 2> "$run_dir/stderr.log" || echo "claude exited $?" >> "$run_dir/stderr.log"
grep '"type":"result"' "$run_dir/stream.jsonl" | tail -1 > "$run_dir/result.json" || true
echo "seconds=$(( $(date +%s) - start ))" > "$run_dir/time.txt"
