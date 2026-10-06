import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/session";

export default async function LoginLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getCurrentSession();

  // Opening the installed app can land on /login. Resume a still-valid
  // seven-day session instead of asking the owner to enter credentials again.
  if (session?.user?.role === "SHOP_OWNER") {
    redirect("/dashboard");
  }

  if (session?.user?.role === "SUPER_ADMIN") {
    redirect("/admin");
  }

  return children;
}
