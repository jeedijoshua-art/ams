import React from 'react';

export default function StudentLoading() {
  return (
    <div className="min-h-screen bg-[#101211] text-[#F1F3ED] flex flex-col">
      {/* Top navbar placeholder */}
      <div className="h-16 border-b border-[#303831] bg-[#101211]/90 backdrop-blur-md px-4 flex items-center justify-between">
        <div className="h-6 w-44 bg-[#202622] rounded-lg animate-pulse" />
        <div className="h-8 w-28 bg-[#202622] rounded-xl animate-pulse" />
      </div>

      <div className="flex-1 flex max-w-7xl mx-auto w-full p-6 lg:p-8 gap-8">
        {/* Sidebar placeholder (desktop) */}
        <div className="hidden md:block w-64 shrink-0 space-y-3">
          <div className="h-4 w-24 bg-[#202622] rounded" />
          <div className="h-10 bg-[#171B18] border border-[#303831] rounded-xl animate-pulse" />
          <div className="h-10 bg-[#171B18] border border-[#303831] rounded-xl animate-pulse" />
          <div className="h-10 bg-[#171B18] border border-[#303831] rounded-xl animate-pulse" />
          <div className="h-10 bg-[#171B18] border border-[#303831] rounded-xl animate-pulse" />
        </div>

        {/* Content area placeholder */}
        <main className="flex-1 space-y-8 animate-pulse">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-8 w-64 bg-[#171B18] rounded-xl" />
              <div className="h-4 w-80 bg-[#202622] rounded" />
            </div>
            <div className="h-10 w-36 bg-[#C6F36B]/15 border border-[#C6F36B]/30 rounded-xl" />
          </div>

          {/* Metric cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="h-28 rounded-xl bg-[#171B18] border border-[#303831]" />
            <div className="h-28 rounded-xl bg-[#171B18] border border-[#303831]" />
            <div className="h-28 rounded-xl bg-[#171B18] border border-[#303831]" />
            <div className="h-28 rounded-xl bg-[#171B18] border border-[#303831]" />
          </div>

          {/* Course breakdown cards */}
          <div className="space-y-4">
            <div className="h-6 w-48 bg-[#202622] rounded" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-44 rounded-xl bg-[#171B18] border border-[#303831]" />
              <div className="h-44 rounded-xl bg-[#171B18] border border-[#303831]" />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
