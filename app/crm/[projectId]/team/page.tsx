'use client';

import React from 'react';
import { useProject } from '@/lib/crm/store';
import { use } from 'react';

export default function TeamPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const { project } = useProject(projectId);
  if (!project) return null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-[#e5e7eb] bg-white px-8 py-5">
        <div>
          <h1 className="text-lg font-semibold text-[#111827]">Team Management</h1>
          <p className="mt-0.5 text-sm text-[#6b7280]">Manage members and roles for {project.name}.</p>
        </div>
        <button className="rounded-md bg-[#7c3aed] px-4 py-2 text-sm font-medium text-white hover:bg-[#6d28d9]">
          Invite Member
        </button>
      </div>
      <div className="flex-1 p-8">
        <div className="rounded-xl border border-[#e5e7eb] bg-white shadow-sm overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[#f3f4f6] bg-[#fafafa] text-xs uppercase tracking-wider text-[#9ca3af]">
              <tr>
                <th className="px-6 py-3.5 font-medium">User</th>
                <th className="px-6 py-3.5 font-medium">Role</th>
                <th className="px-6 py-3.5 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f3f4f6]">
              {project.team.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-10 text-center text-sm text-[#9ca3af]">
                    No team members yet. You are the sole administrator.
                  </td>
                </tr>
              ) : (
                project.team.map(member => (
                  <tr key={member.id} className="hover:bg-[#fafafa] transition-colors">
                    <td className="px-6 py-3.5 text-[#374151]">{member.email}</td>
                    <td className="px-6 py-3.5">
                      <span className="rounded-full bg-[#ede9fe] px-2.5 py-0.5 text-xs font-medium text-[#7c3aed]">
                        {member.role}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button className="text-xs text-[#7c3aed] hover:text-[#6d28d9]">Edit</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
