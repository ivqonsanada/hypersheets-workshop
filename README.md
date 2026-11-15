# Hyper Sheets Workshop plugin

A Claude Code plugin for the Workshop tracks on learnhypersheets.com/workshop. It holds skills only: no hooks, no MCP server, and no script the learner runs.

## Skills

- **video-promo**: a 20-second vertical motion video (1080x1920 MP4) that shows off the learner's one-page site, made with [HyperFrames](https://hyperframes.heygen.com) 0.9.51. Built so Claude Haiku 5.5 on its own makes a decent video: a template that already renders, a table of text slots with character limits, locked timing and styles, and a "look at the frames before you render" step.

## Install

Inside Claude Code:

```text
/plugin marketplace add <owner>/hypersheets-workshop
/plugin install hypersheets-workshop@hypersheets
```

Install from a release tag, never from a moving branch (Workshop plan §4.3 and §5).

## What video-promo needs on the learner's computer

- Node.js 22 or later
- FFmpeg
- About 200 MB of disk for the headless browser HyperFrames downloads on first use

## Layout

```
.claude-plugin/plugin.json        the plugin
.claude-plugin/marketplace.json   so the repo can be added as a marketplace
skills/video-promo/SKILL.md       what Claude reads
skills/video-promo/template/      the video project Claude copies (renders as is)
dev/                              maintainer tools for the Haiku trial (learners never run them)
docs/                             the trial report
```

## Fonts

`template/assets/fonts/` holds Finlandica (SIL Open Font License 1.1, see `OFL.txt` there). JetBrains Mono comes bundled with HyperFrames.
