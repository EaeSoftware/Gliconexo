import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/types/supabase";

const APP_PREFIX = "/app";
const ONBOARDING_PATH = "/onboarding";
const LOGIN_PATH = "/entrar";

/**
 * Valida a sessão no servidor para as rotas protegidas (CLAUDE.md, seção 9)
 * e garante que o onboarding (com o consentimento obrigatório) seja
 * concluído antes do acesso ao app. `getUser()` é usado em vez de
 * `getSession()` porque revalida o token com o servidor de auth, em vez
 * de apenas decodificar o cookie local.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isAppRoute = pathname.startsWith(APP_PREFIX);
  const isOnboardingRoute = pathname.startsWith(ONBOARDING_PATH);

  if (!user) {
    if (isAppRoute || isOnboardingRoute) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = LOGIN_PATH;
      redirectUrl.search = "";
      redirectUrl.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(redirectUrl);
    }
    return response;
  }

  if (isAppRoute || isOnboardingRoute) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("onboarding_completed_at")
      .eq("id", user.id)
      .maybeSingle();

    const onboardingDone = Boolean(profile?.onboarding_completed_at);

    if (isAppRoute && !onboardingDone) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = ONBOARDING_PATH;
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }

    if (isOnboardingRoute && onboardingDone) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = APP_PREFIX;
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }
  }

  return response;
}

export const config = {
  matcher: ["/app/:path*", "/onboarding"],
};
