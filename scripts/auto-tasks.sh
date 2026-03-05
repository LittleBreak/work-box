#!/bin/bash
# auto-tasks.sh — 自动逐任务执行脚本
#
# 用法：
#   ./scripts/auto-tasks.sh tasks/refactor-task.md          # 全自动模式
#   ./scripts/auto-tasks.sh tasks/refactor-task.md --review  # 半自动模式（每个任务后确认）

set -euo pipefail

# ========== 参数解析 ==========

TASK_FILE="${1:-}"
REVIEW_MODE=false

if [ -z "$TASK_FILE" ]; then
  echo "用法: $0 <task-file> [--review]"
  echo "示例: $0 tasks/refactor-task.md"
  echo "      $0 tasks/refactor-task.md --review"
  exit 1
fi

if [ ! -f "$TASK_FILE" ]; then
  echo "❌ 任务文件不存在: $TASK_FILE"
  exit 1
fi

if [ "${2:-}" = "--review" ]; then
  REVIEW_MODE=true
fi

# ========== 状态统计 ==========

count_remaining() {
  grep -c '^\- \[ \]' "$TASK_FILE" 2>/dev/null || echo 0
}

count_completed() {
  grep -c '^\- \[x\]' "$TASK_FILE" 2>/dev/null || echo 0
}

# ========== 主循环 ==========

echo "================================================"
echo "  Work-Box 自动任务执行器"
echo "  任务文件: $TASK_FILE"
echo "  模式: $( [ "$REVIEW_MODE" = true ] && echo '半自动（每任务确认）' || echo '全自动' )"
echo "  待完成: $(count_remaining) 个任务"
echo "================================================"
echo ""

TASK_INDEX=0

while grep -q '^\- \[ \]' "$TASK_FILE"; do
  TASK_INDEX=$((TASK_INDEX + 1))
  REMAINING=$(count_remaining)
  COMPLETED=$(count_completed)

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  第 ${TASK_INDEX} 个任务 | 已完成: ${COMPLETED} | 剩余: ${REMAINING}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  # 调用 Claude Code 执行任务
  cc --print \
    "继续 ${TASK_FILE} 中的下一个任务。完成后更新任务文件状态（将 - [ ] 改为 - [x]）并提交代码。"

  CC_EXIT=$?
  if [ $CC_EXIT -ne 0 ]; then
    echo ""
    echo "❌ Claude Code 执行异常（退出码: $CC_EXIT），停止"
    exit 1
  fi

  # 运行测试验证
  echo ""
  echo "🧪 运行测试验证..."
  if ! pnpm test; then
    echo ""
    echo "❌ 测试失败，停止自动执行"
    echo "   请手动修复后重新运行此脚本"
    exit 1
  fi

  echo ""
  echo "✅ 任务 #${TASK_INDEX} 完成，测试通过"

  # 半自动模式：等待确认
  if [ "$REVIEW_MODE" = true ]; then
    REMAINING_AFTER=$(count_remaining)
    if [ "$REMAINING_AFTER" -gt 0 ]; then
      echo ""
      read -p "审查通过？继续下一个任务？(y/n) " confirm
      if [ "$confirm" != "y" ]; then
        echo "⏸️  已暂停，剩余 ${REMAINING_AFTER} 个任务"
        exit 0
      fi
    fi
  fi
done

echo ""
echo "================================================"
echo "  🎉 所有任务已完成！"
echo "  共执行: ${TASK_INDEX} 个任务"
echo "================================================"
