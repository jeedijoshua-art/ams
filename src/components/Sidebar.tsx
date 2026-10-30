'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Role } from '@prisma/client';
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  UserPlus,
  QrCode,
  History,
  FileSpreadsheet,
  Settings,
  BarChart3,
  CalendarCheck,
  ShieldCheck,
} from 'lucide-react';

interface SidebarProps {
  role: Role | string;
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();

  const adminLinks = [
    { label: 'Overview', href: '/bosshere', icon: LayoutDashboard },
    { label: 'Students', href: '/bosshere/students', icon: GraduationCap },
    { label: 'Bulk Registration', href: '/bosshere/students/bulk', icon: FileSpreadsheet },
    { label: 'Faculty', href: '/bosshere/faculty', icon: Users },
    { label: 'Subjects', href: '/bosshere/subjects', icon: BookOpen },
    { label: 'Enrollments', href: '/bosshere/enrollments', icon: UserPlus },
    { label: 'Audit Trail', href: '/bosshere/audit', icon: History },
    { label: 'Threshold & Settings', href: '/bosshere/settings', icon: Settings },
    { label: 'Reports & Analytics', href: '/reports', icon: BarChart3 },
  ];

  const facultyLinks = [
    { label: 'Faculty Overview', href: '/faculty', icon: LayoutDashboard },
    { label: 'Create QR Session', href: '/faculty/sessions/new', icon: QrCode },
    { label: 'Attendance Sessions', href: '/faculty/sessions', icon: CalendarCheck },
    { label: 'Attendance Sheets & CSV', href: '/faculty/reports', icon: FileSpreadsheet },
    { label: 'Reports & Analytics', href: '/reports', icon: BarChart3 },
  ];

  const studentLinks = [
    { label: 'My Dashboard', href: '/student', icon: LayoutDashboard },
    { label: 'Course Registration', href: '/student/courses', icon: BookOpen },
    { label: 'Scan Attendance QR', href: '/student/scan', icon: QrCode },
    { label: 'Attendance History', href: '/student/history', icon: History },
    { label: 'Analytics & Trends', href: '/reports', icon: BarChart3 },
  ];

  const links =
    role === Role.ADMIN || role === 'ADMIN'
      ? adminLinks
      : role === Role.FACULTY || role === 'FACULTY'
      ? facultyLinks
      : studentLinks;

  return (
    <aside className="w-64 shrink-0 hidden md:block border-r border-[#303831] bg-[#101211] min-h-[calc(100vh-4rem)] p-4">
      <div className="space-y-1">
        <p className="px-3 text-[11px] font-mono font-semibold text-[#A0A89F] uppercase tracking-wider mb-2">
          {role} Workspace
        </p>

        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                isActive
                  ? 'bg-[#202622] text-[#C6F36B] border border-[#303831] font-bold shadow-sm'
                  : 'text-[#A0A89F] hover:text-[#F1F3ED] hover:bg-[#171B18]'
              }`}
            >
              <Icon
                className={`w-4 h-4 ${
                  isActive ? 'text-[#C6F36B]' : 'text-[#A0A89F]'
                }`}
              />
              {link.label}
            </Link>
          );
        })}
      </div>

      {/* Safety Notice Footer */}
      <div className="mt-8 p-3.5 rounded-xl bg-[#171B18] border border-[#303831] text-[11px] text-[#A0A89F] leading-relaxed">
        <div className="flex items-center gap-1.5 font-bold text-[#F1F3ED] mb-1 font-mono text-[10px]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#C6F36B]" />
          SECURITY LEVEL: STRICT
        </div>
        Attendance records, tokens, and calculations are strictly validated on the server.
      </div>
    </aside>
  );
}
