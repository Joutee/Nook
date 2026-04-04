#!/usr/bin/env bash
input=$(cat)

# Extract values
project_dir=$(echo "$input" | jq -r '.workspace.project_dir // .cwd // "unknown"')
project_name=$(basename "$project_dir")
output_style=$(echo "$input" | jq -r '.output_style.name // "default"')
model=$(echo "$input" | jq -r '.model.display_name // "unknown"')
used_pct=$(echo "$input" | jq -r '.context_window.used_percentage // empty')

# Build context bar (20 chars wide)
if [ -n "$used_pct" ]; then
  filled=$(printf "%.0f" "$(echo "$used_pct * 20 / 100" | bc -l 2>/dev/null || echo "0")")
  [ "$filled" -gt 20 ] 2>/dev/null && filled=20
  [ "$filled" -lt 0 ] 2>/dev/null && filled=0
  bar=""
  for i in $(seq 1 $filled 2>/dev/null); do bar="${bar}#"; done
  empty_count=$((20 - filled))
  for i in $(seq 1 $empty_count 2>/dev/null); do bar="${bar}-"; done
  context_part="[${bar}] $(printf '%.0f' "$used_pct")%"
else
  context_part="[--------------------] --%"
fi

printf "%s | theme:%s | %s | ctx:%s" "$project_name" "$output_style" "$model" "$context_part"
