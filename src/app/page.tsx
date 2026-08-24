"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { OrganizationLogo } from "@/roles/shared/components/brand/OrganizationLogo";
import Footer from "@/roles/shared/components/layout/Footer";
import {
  resolvePortalLogin,
  savePortalSession,
} from "@/roles/shared/features/roles/mock-login";
import { useRoleAssignmentStore } from "@/roles/shared/features/roles/role-assignment-store";

export default function LoginPage() {
  const router = useRouter();
  const { assignments } = useRoleAssignmentStore();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    setLoginError(null);
    setIsSubmitting(true);
    toast.loading("กำลังตรวจสอบข้อมูล...", { id: "login" });
    
    const requestedPath = new URLSearchParams(window.location.search).get("next");
    try {
      const result = resolvePortalLogin(identifier, password, requestedPath, assignments);
      savePortalSession(result.session);
      toast.success("เข้าสู่ระบบสำเร็จ", { id: "login" });
      router.push(result.destination);
    } catch (error) {
      const message = error instanceof Error ? error.message : "ไม่สามารถเข้าสู่ระบบได้";
      setLoginError(message);
      toast.error(message, { id: "login" });
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-background font-sans">
      
      {/* Left Panel: Background Image */}
      <div className="hidden md:flex md:w-1/2 lg:w-[55%] relative flex-col justify-end p-12 text-content-on-image overflow-hidden">
        <div className="absolute inset-0 z-0 bg-[url('/login_bg.png')] bg-cover bg-center" />
        {/* Dark overlay for text readability */}
        <div className="absolute inset-0 z-10 bg-gradient-to-t from-login-overlay-strong/90 via-login-overlay/40 to-transparent" />
        
        <div className="relative z-20 max-w-xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            <OrganizationLogo className="mb-6 h-24 w-auto object-contain lg:h-28 xl:h-32" />
            <h1 className="text-4xl font-bold mb-4 leading-tight">
              ราชวิทยาลัยเภสัชกรรม<br />แห่งประเทศไทย
            </h1>
            <p className="text-lg text-content-on-image/80 font-medium">ระบบบริการสมาชิกวิชาชีพ PCOR</p>
          </motion.div>
        </div>
      </div>

      {/* Right Panel: Login Form */}
      <div className="relative flex flex-1 flex-col border-t-4 border-primary p-6 sm:p-12 md:border-t-0">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="my-auto w-full max-w-sm self-center"
        >
          <div className="md:hidden flex flex-col items-center mb-8">
            <OrganizationLogo className="mb-4 h-24 w-auto object-contain sm:h-28" />
            <h1 className="text-xl font-bold text-center text-primary">ราชวิทยาลัยเภสัชกรรม<br/>แห่งประเทศไทย</h1>
          </div>

          <div className="mb-8">
            <p className="text-2xs font-semibold uppercase tracking-wider text-primary mb-1">ระบบบริการสมาชิกวิชาชีพ PCOR</p>
            <h2 className="text-2xl font-bold text-foreground mb-2">เข้าสู่ระบบ</h2>
            <p className="text-sm text-muted-foreground">เข้าสู่ระบบเพื่อใช้บริการข้อมูลวิชาชีพของคุณ</p>
          </div>

          <form className="space-y-5" onSubmit={handleLogin}>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground/80" htmlFor="identifier">
                เลขที่ใบประกอบวิชาชีพ
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-muted-foreground">
                  <span className="material-symbols-outlined text-xl">badge</span>
                </span>
                <Input 
                  id="identifier"
                  type="text" 
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="เช่น ภ.12345"
                  autoComplete="username"
                  required
                  className="pl-10 h-11 bg-muted/30 focus-visible:bg-transparent transition-colors" 
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center">
                <label className="text-sm font-semibold text-foreground/80" htmlFor="password">
                  รหัสผ่าน
                </label>

              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-muted-foreground">
                  <span className="material-symbols-outlined text-xl">lock</span>
                </span>
                <Input 
                  id="password" 
                  type={showPassword ? "text" : "password"} 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  autoComplete="current-password"
                  required
                  className="pl-10 pr-10 h-11 bg-muted/30 focus-visible:bg-transparent transition-colors" 
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"}
                  className="absolute inset-y-0 right-0 flex min-w-11 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                >
                  <span aria-hidden="true" className="material-symbols-outlined text-xl">
                    {showPassword ? "visibility" : "visibility_off"}
                  </span>
                </button>
              </div>
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full h-11 text-base font-semibold shadow-md mt-2">
              {isSubmitting ? (
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined animate-spin">progress_activity</span>
                  กำลังเข้าสู่ระบบ...
                </div>
              ) : (
                "เข้าสู่ระบบ"
              )}
            </Button>
            {loginError && (
              <p role="alert" className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {loginError}
              </p>
            )}
          </form>

        </motion.div>
        <Footer />
      </div>

    </div>
  );
}
