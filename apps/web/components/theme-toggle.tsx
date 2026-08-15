"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

/**
 * 읽는 자리를 사람이 고르게 한다. 기본값은 시스템 설정이고, 손으로 바꾸면 그
 * 선택이 기억된다.
 *
 * 칠하기 전의 첫 판정은 `app/layout.tsx`의 인라인 스크립트가 한다. 여기서는
 * 그 뒤의 전환만 맡으므로, 마운트 전에는 아무 아이콘도 내놓지 않는다 — 서버가
 * 모르는 값을 미리 그리면 첫 프레임에서 아이콘이 바뀐다.
 */
export function ThemeToggle() {
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    setDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggle() {
    const next = !document.documentElement.classList.contains("dark");

    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
    setDark(next);
  }

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      onClick={toggle}
      aria-label={dark === true ? "밝은 지면으로" : "어두운 지면으로"}
      className="text-muted-foreground hover:text-foreground -mt-1 shrink-0"
    >
      {dark === null ? null : dark ? (
        <Sun className="size-4" strokeWidth={1.5} />
      ) : (
        <Moon className="size-4" strokeWidth={1.5} />
      )}
    </Button>
  );
}
