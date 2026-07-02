#!/bin/bash

# エラーが発生してもスクリプト全体を中断せず、安全に正常終了(exit 0)させるための設定
set +e

# 対象ファイルのリストを作成
TARGET_FILES=()

# 1. 引数として変更ファイルパスが渡された場合
if [ -n "$1" ]; then
  for file in $1; do
    if [ -f "$file" ]; then
      TARGET_FILES+=("$file")
    fi
  done
fi

# 2. 引数が空、または追加の変更を検知したい場合は git diff も併用
while IFS= read -r file; do
  if [ -f "$file" ]; then
    TARGET_FILES+=("$file")
  fi
done < <(git diff --name-only 2>/dev/null; git ls-files --others --exclude-standard 2>/dev/null)

# 重複したファイルパスを排除
UNIQUE_FILES=$(echo "${TARGET_FILES[@]}" | tr ' ' '\n' | sort -u)

# 各ファイルに対して拡張子に応じたフォーマッタ/Linterを非同期に実行
for file in $UNIQUE_FILES; do
  [ -f "$file" ] || continue

  case "$file" in
    # TypeScript, TSX, JavaScript, JSX, JSON, YAML などのフロントエンド関連のみを対象
    *.ts|*.tsx|*.js|*.jsx|*.json|*.yml|*.yaml)
      # pnpm を優先使用し、Prettier でフォーマット
      if command -v pnpm >/dev/null 2>&1; then
        (pnpm exec prettier --write "$file" >/dev/null 2>&1) &
        (pnpm exec eslint --fix "$file" >/dev/null 2>&1) &
      elif command -v npx >/dev/null 2>&1; then
        (npx prettier --write "$file" >/dev/null 2>&1) &
        (npx eslint --fix "$file" >/dev/null 2>&1) &
      fi
      ;;
  esac
done

# バックグラウンドプロセスの完了を待たずに即時正常終了する
exit 0
