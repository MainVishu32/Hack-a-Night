import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full border-t border-[#293548] bg-[#0B1220] py-8 text-xs text-[#A8B3C7]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[#F8FAFC]">PulseReserve</span>
          <span aria-hidden="true">·</span>
          <span>Adaptive, Self-Healing Inventory Coordination Engine</span>
        </div>

        <div className="flex items-center gap-6">
          <span>PostgreSQL Strict ACID Invariants</span>
          <span aria-hidden="true">·</span>
          <span>Redis Lua Atomic Fencing</span>
          <span aria-hidden="true">·</span>
          <span>Transactional Outbox Worker</span>
        </div>

        <div className="font-mono text-[11px] text-[#A8B3C7]/80">
          Hackathon Architecture Release · {new Date().getFullYear()}
        </div>
      </div>
    </footer>
  );
};
