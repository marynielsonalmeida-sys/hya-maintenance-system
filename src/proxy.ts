import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getSupabasePublishableKey, getSupabaseUrl } from "@/lib/supabase/config";

const protectedPrefixes = ["/app", "/dashboard", "/clientes", "/equipamentos", "/chamados", "/ordens", "/tecnicos", "/pecas", "/financeiro", "/relatorios", "/configuracoes"];

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });
  const supabase = createServerClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  const isProtected = protectedPrefixes.some((prefix) => request.nextUrl.pathname === prefix || request.nextUrl.pathname.startsWith(`${prefix}/`));
  if (isProtected && !user) return redirect(request, "/login");

  if (isProtected && user) {
    const { data: membership } = await supabase.from("company_members").select("id").eq("profile_id", user.id).eq("status", "ACTIVE").limit(1).maybeSingle();
    if (!membership) return redirect(request, "/onboarding");
  }

  if ((request.nextUrl.pathname === "/login" || request.nextUrl.pathname === "/cadastro") && user) {
    const { data: membership } = await supabase.from("company_members").select("id").eq("profile_id", user.id).eq("status", "ACTIVE").limit(1).maybeSingle();
    return redirect(request, membership ? "/dashboard" : "/onboarding");
  }
  return response;
}

function redirect(request: NextRequest, path: string) {
  const url = request.nextUrl.clone();
  url.pathname = path;
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = { matcher: ["/login", "/cadastro", "/app/:path*", "/dashboard/:path*", "/clientes/:path*", "/equipamentos/:path*", "/chamados/:path*", "/ordens/:path*", "/tecnicos/:path*", "/pecas/:path*", "/financeiro/:path*", "/relatorios/:path*", "/configuracoes/:path*"] };
