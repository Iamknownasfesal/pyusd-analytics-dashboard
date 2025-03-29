"use client";

import Link from "next/link";
import { useAddress } from "@/components/address/address-context";

export function Header() {
  useAddress();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container md:px-0 px-4 mx-auto flex h-16 items-center justify-between">
        <div className="flex">
          <Link href="/" className="flex items-center space-x-2">
            <span className="font-bold text-xl bg-gradient-to-r from-blue-500 to-cyan-500 bg-clip-text text-transparent">
              PYUSD Analytics
            </span>
          </Link>
        </div>

        <div className="w-full max-w-xl mx-4">
          <div className="search-container" id="header-search-container">
            {/* This div will be used to mount the search component */}
          </div>
        </div>
      </div>
    </header>
  );
}
