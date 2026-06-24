'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutGrid } from 'lucide-react';

export function GlobalSidebar() {
  const pathname = usePathname();

  const navItems = [
    { name: 'Projects', href: '/crm/projects', icon: LayoutGrid },
  ];

  return (
    <div className="flex w-60 shrink-0 flex-col border-r border-[#e5e7eb] bg-white">
      {/* Logo */}
      <div className="flex h-14 items-center px-5 border-b border-[#e5e7eb]">
        <span className="text-[15px] font-bold text-[#111827] tracking-tight">CRM Builder</span>
      </div>
      
      {/* Nav */}
      <div className="flex-1 px-3 py-4">
        <nav className="space-y-0.5">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors ${
                  isActive
                    ? 'bg-[#ede9fe] text-[#6d28d9]'
                    : 'text-[#374151] hover:bg-[#f3f4f6] hover:text-[#111827]'
                }`}
              >
                <item.icon className={`h-[16px] w-[16px] ${isActive ? 'text-[#7c3aed]' : 'text-[#9ca3af]'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User */}
      <div className="border-t border-[#e5e7eb] p-4 flex items-center gap-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#7c3aed] text-xs font-semibold text-white">
          U
        </div>
        <div>
          <div className="text-[13px] font-medium text-[#111827]">My Account</div>
          <div className="text-[11px] text-[#9ca3af]">Admin</div>
        </div>
      </div>
    </div>
  );
}
