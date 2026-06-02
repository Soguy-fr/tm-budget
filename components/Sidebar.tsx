"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/budgets", label: "Budgets" },
  { href: "/structure", label: "Structure" },
  { href: "/interne", label: "Interne" },
  { href: "/bailleurs", label: "Bailleurs" },
  { href: "/grand-livre", label: "Grand Livre" },
  { href: "/suivi", label: "Suivi" },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <nav className="w-48 shrink-0 border-r border-slate-200 bg-white p-3">
      <div className="mb-4 px-2 font-heading text-sm font-bold text-brand-night">
        Budget ONG
      </div>
      <ul className="space-y-1">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`block rounded px-3 py-1.5 text-sm ${
                  active
                    ? "bg-brand-night text-white"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
