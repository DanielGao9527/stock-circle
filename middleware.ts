import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const PUBLIC_PATHS = ["/login"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export async function middleware(request: NextRequest) {
  const { user, response } = await updateSession(request);

  const { pathname } = request.nextUrl;
  const isPublic = isPublicPath(pathname);

  // Redirect unauthenticated users to login for protected pages.
  if (!user && !isPublic) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect authenticated users away from login page.
  if (user && isPublic) {
    const redirectUrl = request.nextUrl.clone();
    const nextPath = request.nextUrl.searchParams.get("next");
    redirectUrl.pathname = nextPath && nextPath !== "/login" ? nextPath : "/";
    redirectUrl.searchParams.delete("next");
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
