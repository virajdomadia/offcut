"use client";

import { useEffect, useId, useRef, useState } from "react";

const links = [
  { href: "/#new", label: "New" },
  { href: "/#look", label: "Shop the look" },
  { href: "/#ops", label: "How it runs" },
  { href: "/#early-access", label: "Early access" },
];

export function Header() {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const mq = window.matchMedia("(min-width: 901px)");
    const onWide = () => mq.matches && setOpen(false);
    document.addEventListener("keydown", onKey);
    mq.addEventListener("change", onWide);
    return () => {
      document.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onWide);
    };
  }, [open]);

  return (
    <header className="wrap">
      <a className="skip" href="#main">Skip to content</a>
      <nav className="nav" aria-label="Main">
        <a className="logo" href="/"><svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" fill="#000"/><circle cx="32" cy="32" r="18" fill="none" stroke="#fff" strokeWidth="7"/><polygon points="34,6 64,6 64,36" fill="#000"/><polygon points="36,4 64,4 64,32" fill="#D6FF3B" transform="translate(2 -2)"/></svg>Offcut</a>
        <ul className="nav-links">{links.map((l) => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}</ul>
        <div className="right">
          <a className="acct" href="/#early-access">Account</a>
          <a className="bag" href="/#early-access">Bag</a>
          <button
            ref={buttonRef}
            type="button"
            className="menu-btn"
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? "Close" : "Menu"}
          </button>
        </div>
      </nav>
      <div id={menuId} className="mobile-menu" hidden={!open}>
        <ul>
          {links.map((l) => <li key={l.href}><a href={l.href} onClick={() => setOpen(false)}>{l.label}</a></li>)}
          <li><a href="/#early-access" onClick={() => setOpen(false)}>Account</a></li>
        </ul>
      </div>
    </header>
  );
}
