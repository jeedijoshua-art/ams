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
    { label: 'Overview', href: '/admin', icon: LayoutDashboard },
    { label: 'Students', href: '/admin/students', icon: GraduationCap },
    { label: 'Faculty', href: '/admin/faculty', icon: Users },
    { label: 'Subjects', href: '/admin/subjects', icon: BookOpen },
    { label: 'Enrollments', href: '/admin/enrollments', icon: UserPlus },
    { label: 'Threshold & Settings', href: '/admin/settings', icon: Settings },
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
    <aside className="w-64 shrink-0 hidden md:block border-r border-slate-800 bg-slate-950 min-h-[calc(100vh-4rem)] p-4">
      <div className="space-y-1">
        <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
          {role} Workspace
        </p>

        {links.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-teal-500/10 text-teal-300 border border-teal-500/20 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900'
              }`}
            >
              <Icon
                className={`w-4 h-4 ${
                  isActive ? 'text-teal-400' : 'text-slate-400 group-hover:text-slate-300'
                }`}
              />
              {link.label}
            </Link>
          );
        })}
      </div>

      {/* Safety Notice Footer */}
      <div className="mt-8 p-3 rounded-xl bg-slate-900/60 border border-slate-800/80 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5 font-semibold text-slate-300 mb-1">
          <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
          Security Boundary
        </div>
        All attendance calculations and role permissions are strictly validated on the server.
      </div>
    </aside>
  );
}
