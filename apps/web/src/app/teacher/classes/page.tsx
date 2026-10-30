"use client";

import React, { useState } from "react";
import Link from "next/link";
import { BookOpen, Users, CheckCircle2, AlertCircle, ArrowLeft, ArrowRight, Search } from "lucide-react";
import { INITIAL_STUDENTS } from "@/lib/mock_data";

interface CourseSection {
  id: string;
  code: string;
  title: string;
  department: string;
  semester: string;
  students_count: number;
  verified_count: number;
}

export default function TeacherClassesPage() {
  const sampleClasses: CourseSection[] = [
    {
      id: "cls_cs401",
      code: "CS401",
      title: "Distributed Systems and Cryptographic Protocols",
      department: "Computer Science and Engineering",
      semester: "Semester 7",
      students_count: 65,
      verified_count: 62,
    },
    {
      id: "cls_cs302",
      code: "CS302",
      title: "Database Management and Transaction Logs",
      department: "Computer Science and Engineering",
      semester: "Semester 5",
      students_count: 72,
      verified_count: 68,
    },
    {
      id: "cls_ec204",
      code: "EC204",
      title: "Digital Logic and Hardware Security",
      department: "Electronics and Communication",
      semester: "Semester 4",
      students_count: 58,
      verified_count: 55,
    },
  ];

  const [selectedClassId, setSelectedClassId] = useState<string>("cls_cs401");

  const activeClass = sampleClasses.find((c) => c.id === selectedClassId) || sampleClasses[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-[#1E3352]">
        <div>
          <Link
            href="/teacher"
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#157E92] dark:text-[#38BDF8] hover:underline mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Back to Teacher Workspace</span>
          </Link>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-semibold bg-[#15805D]/10 text-[#15805D] dark:text-[#34D399] mb-1">
            <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
            Academic Roster
          </div>
          <h1 className="text-3xl font-bold text-[#10233F] dark:text-white tracking-tight">
            My Classes
          </h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            Supervise course section rosters and confirm student eligibility for upcoming elections.
          </p>
        </div>
      </div>

      {/* Class Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {sampleClasses.map((cls) => {
          const percent = Math.round((cls.verified_count / cls.students_count) * 100);
          const isSelected = cls.id === selectedClassId;
          return (
            <div
              key={cls.id}
              onClick={() => setSelectedClassId(cls.id)}
              className={`p-6 rounded-xl border cursor-pointer transition-all ${
                isSelected
                  ? "border-[#157E92] bg-[#157E92]/5 dark:bg-[#157E92]/10 shadow-md ring-2 ring-[#157E92]"
                  : "border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm hover:border-slate-400"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                  {cls.code}
                </span>
                <span className="text-xs text-slate-400">{cls.semester}</span>
              </div>
              <h2 className="text-base font-bold text-[#10233F] dark:text-white mt-2">
                {cls.title}
              </h2>
              <p className="text-xs text-slate-500 mt-1">{cls.department}</p>

              <div className="mt-4 pt-4 border-t border-slate-100 dark:border-[#1E3352] space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Verification Status</span>
                  <span className="font-bold text-[#15805D]">{percent}%</span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-[#15805D] h-full rounded-full transition-all"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <div className="text-[11px] text-slate-400">
                  {cls.verified_count} of {cls.students_count} students verified
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Class Student Roster */}
      <div className="rounded-xl border border-slate-200 dark:border-[#1E3352] bg-white dark:bg-[#132135] shadow-sm overflow-hidden space-y-4 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-[#1E3352]">
          <div>
            <h3 className="font-bold text-lg text-[#10233F] dark:text-white">
              {activeClass.code} Enrolled Students
            </h3>
            <p className="text-xs text-slate-500">
              Department: {activeClass.department} | Total Enrolled: {activeClass.students_count}
            </p>
          </div>
          <Link
            href="/teacher/verification-queue"
            className="min-h-[44px] px-4 py-2 font-bold text-white bg-[#15805D] hover:bg-[#0E6273] rounded-lg transition-colors flex items-center gap-2 text-xs shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#15805D]"
          >
            <span>Open Verification Queue</span>
            <ArrowRight className="w-4 h-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-[#1E3352]">
              <tr>
                <th scope="col" className="px-6 py-3">Student Name</th>
                <th scope="col" className="px-6 py-3">Student ID</th>
                <th scope="col" className="px-6 py-3">Institutional Email</th>
                <th scope="col" className="px-6 py-3">Roster Verification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#1E3352]">
              {INITIAL_STUDENTS.map((stu) => (
                <tr key={stu.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                  <td className="px-6 py-4 font-bold text-[#10233F] dark:text-white">
                    {stu.full_name}
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-slate-600 dark:text-slate-300">
                    {stu.student_id}
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500">
                    {stu.email}
                  </td>
                  <td className="px-6 py-4">
                    {stu.verified ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-bold bg-[#15805D]/10 text-[#15805D]">
                        <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>VERIFIED</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-xs font-bold bg-[#AA6C0B]/10 text-[#AA6C0B]">
                        <AlertCircle className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>PENDING REVIEW</span>
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
