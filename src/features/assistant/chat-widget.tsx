"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AssistantIcon } from "./icons";
import styles from "./chat.module.css";

const Panel = dynamic(() => import("./chat-panel").then((module) => module.ChatPanel), { ssr: false });

function ScopedWidget({ demo }: { demo: boolean }) {
  const [open, setOpen] = useState(false), [visited, setVisited] = useState(false);
  const launcher = useRef<HTMLButtonElement>(null);
  function close() { setOpen(false); requestAnimationFrame(() => launcher.current?.focus()); }
  useEffect(() => {
    function shortcut(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "j") { event.preventDefault(); setVisited(true); setOpen((value) => !value); }
    }
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, []);
  return <div className={styles.widget}>
    {visited && <div hidden={!open}><Panel demo={demo} open={open} onClose={close} /></div>}
    <button ref={launcher} type="button" className={styles.launcher} aria-label={open ? "Close Hackleaf assistant" : "Open Hackleaf assistant"} aria-expanded={open} aria-controls="hackleaf-assistant" onClick={() => { setVisited(true); if (open) close(); else setOpen(true); }}>
      <AssistantIcon name={open ? "close" : "chat"} /><span>{open ? "Close" : "Ask Hackleaf"}</span>
    </button>
  </div>;
}

export function ChatWidget({ demo }: { demo: boolean }) {
  return <ScopedWidget key={String(demo)} demo={demo} />;
}
