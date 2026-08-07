"use client";

import { Landmark, ListTodo, Settings, Swords } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArtStyleToggle } from "./ArtStyleProvider";

const links = [
  { href: "/", label: "Today", icon: ListTodo },
  { href: "/battle", label: "Battle", icon: Swords },
  { href: "/bank", label: "Bank", icon: Landmark },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Navigation() {
  const pathname = usePathname();
  return (
    <>
      <header className="site-header">
        <Link href="/" className="wordmark">FOURFOLD</Link>
        <div className="header-actions"><nav>
          {links.map(({ href, label }) => <Link key={href} href={href} className={pathname === href ? "active" : ""}>{label}</Link>)}
        </nav><ArtStyleToggle /></div>
      </header>
      <nav className="mobile-tabs">
        {links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className={pathname === href ? "active" : ""}><Icon size={19}/><span>{label}</span></Link>)}
      </nav>
    </>
  );
}
