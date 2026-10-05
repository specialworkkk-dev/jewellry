import "server-only";

import { cache } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";

// Layouts and pages render together. Memoization avoids decoding the same
// session cookie independently in each one during a single request.
export const getCurrentSession = cache(() => getServerSession(authOptions));
