"use client";

import { useState } from "react";

type CopyTextButtonProps = {
  text: string;
  className?: string;
  idleLabel?: string;
  successLabel?: string;
};

export function CopyTextButton({
  text,
  className,
  idleLabel = "复制",
  successLabel = "已复制",
}: CopyTextButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);

    window.setTimeout(() => {
      setCopied(false);
    }, 1600);
  }

  return (
    <button
      type="button"
      onClick={() => {
        void handleCopy();
      }}
      className={className}
    >
      {copied ? successLabel : idleLabel}
    </button>
  );
}
