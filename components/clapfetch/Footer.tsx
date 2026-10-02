'use client';

import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="border-t border-[#E9E4EC]/60 bg-transparent py-14">
      <div className="mx-auto max-w-[1240px] px-6 sm:px-8">
        <div className="flex flex-col sm:flex-row items-baseline justify-between gap-6">
          <div>
            <div className="text-[15px] font-bold text-[#211D25] tracking-tight">
              Clapfetch
            </div>
            <div className="text-xs text-[#918B95] mt-1 font-medium">
              A Northrosc product
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-[#69636E]">
            <span className="text-[#918B95]">northrosc.com</span>
            <span>·</span>
            <button className="hover:text-[#211D25] transition-cf">Privacy</button>
            <button className="hover:text-[#211D25] transition-cf">Terms</button>
            <button className="hover:text-[#211D25] transition-cf">Contact</button>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-[#E9E4EC] flex flex-col sm:flex-row items-center justify-between text-[11px] text-[#918B95]">
          <p>© 2026 Northrosc. All rights reserved.</p>
          <p className="mt-1 sm:mt-0">Take what you need. Leave the rest.</p>
        </div>
      </div>
    </footer>
  );
}
