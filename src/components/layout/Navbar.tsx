"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import LogoutButton from "../LogoutButton";

interface NavbarProps {
  user?: {
    name?: string | null;
    email?: string | null;
  } | null;
}

export default function Navbar({ user }: NavbarProps) {
  const pathname = usePathname();

  const navItems = [
    { name: "Analytics Dashboard", href: "/" },
    { name: "Quotation List", href: "/quotes" },
    { name: "Customer Directory", href: "/customers" },
    { name: "Parts Catalogue", href: "/parts" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-zinc-200 bg-white/80 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-900/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        
        {/* Left Section: Brand & Navigation */}
        <div className="flex items-center gap-6 lg:gap-8">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-sm font-black text-white">
              QF
            </span>
            <span className="text-lg">QuoteFlow</span>
            <span className="hidden sm:inline-block rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-blue-600 dark:bg-blue-950/50 dark:text-blue-400">
              Enterprise
            </span>
          </Link>

          {/* Navigation Links - Only visible if logged in */}
          {user && (
            <nav className="hidden md:flex items-center gap-1 sm:gap-2">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== "/" && pathname?.startsWith(item.href));

                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors sm:text-sm ${
                      isActive
                        ? "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                        : "text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900 dark:hover:bg-zinc-800/50 dark:hover:text-zinc-100"
                    }`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>

        {/* Right Section: User Profile & Auth Controls */}
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {user.name}
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  {user.email}
                </p>
              </div>
              <LogoutButton />
            </div>
          ) : (
            <Link
              href="/login"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              Sign in
            </Link>
          )}
        </div>

      </div>
    </header>
  );
}