export function AssistantIcon({ name }: { name: "chat" | "close" | "send" | "stop" | "attach" | "new" | "copy" | "download" }) {
  const paths = {
    chat: <><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H7l-4 3v-8A7.5 7.5 0 0 1 10.5 6H13" /><path d="m18 2 1 3 3 1-3 1-1 3-1-3-3-1 3-1 1-3Z" /><path d="M7 12h7M7 15h4" /></>,
    close: <path d="m6 6 12 12M18 6 6 18" />,
    send: <><path d="m4 11 16-7-7 16-2-7-7-2Z" /><path d="m11 13 9-9" /></>,
    stop: <rect x="6" y="6" width="12" height="12" rx="1" />,
    attach: <path d="m8 12 6-6a3 3 0 0 1 4 4l-8 8a5 5 0 0 1-7-7l9-9M7 13l7-7" />,
    new: <><path d="M12 5v14M5 12h14" /><rect x="3" y="3" width="18" height="18" rx="5" /></>,
    copy: <><rect x="8" y="8" width="12" height="13" rx="2" /><path d="M16 8V3H3v13h5" /></>,
    download: <><path d="M12 3v12m-4-4 4 4 4-4M4 16v5h16v-5" /></>,
  };
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
