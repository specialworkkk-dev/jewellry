"use client";

import { useState, useRef, useEffect } from "react";
import { signOut } from "next-auth/react";
import { LogOut, User as UserIcon } from "lucide-react";

export default function UserProfileDropdown({ name, email }: { name: string; email?: string | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-9 h-9 rounded-full bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
      >
        <span className="font-bold text-sm">
          {name.charAt(0).toUpperCase()}
        </span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 transform opacity-100 scale-100 transition-all origin-top-right">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-medium text-gray-900 truncate">{name}</p>
            {email && <p className="text-xs text-gray-500 truncate mt-0.5">{email}</p>}
          </div>
          
          <div className="py-1">
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
