"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { OrganizationLogo } from "@/roles/shared/components/brand/OrganizationLogo";
import {
  COLLEGE_OPTIONS,
  isCollegeCode,
  type CollegeCode,
} from "@/roles/shared/data/college-directory";
import Footer from "@/roles/shared/components/layout/Footer";
import {
  resolvePortalLogin,
  savePortalSession,
} from "@/roles/shared/features/roles/mock-login";
import { useRoleAssignmentStore } from "@/roles/shared/features/roles/role-assignment-store";

const ENTRY_PROFILE_STORAGE_KEY = "pcor:entry-profile:v1";

function readEntryProfileSnapshot() {
  try {
    return window.sessionStorage.getItem(ENTRY_PROFILE_STORAGE_KEY);
  } catch {
    return null;
  }
}

function subscribeToEntryProfile() {
  return () => undefined;
}

function hasValidEntryProfile(snapshot: string | null) {
  if (!snapshot) return false;

  try {
    const parsedProfile = JSON.parse(snapshot) as unknown;
    if (typeof parsedProfile !== "object" || parsedProfile === null) return false;

    const profile = parsedProfile as Record<string, unknown>;
    return isCollegeCode(profile.collegeCode)
      && typeof profile.firstName === "string"
      && Boolean(profile.firstName.trim())
      && typeof profile.lastName === "string"
      && Boolean(profile.lastName.trim());
  } catch {
    return false;
  }
}

export default function LoginPage() {
  const router = useRouter();
  const { assignments } = useRoleAssignmentStore();
  const collegeSelectRef = useRef<HTMLSelectElement>(null);
  const firstNameRef = useRef<HTMLInputElement>(null);
  const lastNameRef = useRef<HTMLInputElement>(null);
  const entryProfileSnapshot = useSyncExternalStore(
    subscribeToEntryProfile,
    readEntryProfileSnapshot,
    () => null,
  );
  const [hasCompletedEntryProfile, setHasCompletedEntryProfile] = useState(false);
  const [collegeCode, setCollegeCode] = useState<CollegeCode | "">("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [entrySubmitted, setEntrySubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const trimmedFirstName = firstName.trim();
  const trimmedLastName = lastName.trim();
  const hasCollegeError = entrySubmitted && !collegeCode;
  const hasFirstNameError = entrySubmitted && !trimmedFirstName;
  const hasLastNameError = entrySubmitted && !trimmedLastName;
  const entryError = entrySubmitted && (hasCollegeError || hasFirstNameError || hasLastNameError)
    ? "กรุณาเลือกวิทยาลัยและกรอกชื่อ–นามสกุลให้ครบถ้วน"
    : "";
  const isEntryDialogOpen = !hasCompletedEntryProfile && !hasValidEntryProfile(entryProfileSnapshot);

  const handleEntryProfile = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setEntrySubmitted(true);

    if (!collegeCode || !trimmedFirstName || !trimmedLastName) {
      window.requestAnimationFrame(() => {
        if (!collegeCode) collegeSelectRef.current?.focus();
        else if (!trimmedFirstName) firstNameRef.current?.focus();
        else lastNameRef.current?.focus();
      });
      return;
    }

    try {
      window.sessionStorage.setItem(ENTRY_PROFILE_STORAGE_KEY, JSON.stringify({
        collegeCode,
        firstName: trimmedFirstName,
        lastName: trimmedLastName,
        recordedAt: new Date().toISOString(),
      }));
    } catch {
      // Storage may be unavailable in privacy-restricted browsers. The current
      // visit can still proceed after the required information is completed.
    }

    setEntrySubmitted(false);
    setHasCompletedEntryProfile(true);
    window.requestAnimationFrame(() => document.getElementById("identifier")?.focus());
  };

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
    <>
      <Dialog open={isEntryDialogOpen}>
        <DialogContent
          showCloseButton={false}
          className="max-h-[calc(100dvh-2rem)] gap-5 overflow-y-auto sm:max-w-lg"
          onEscapeKeyDown={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}
        >
          <DialogHeader className="pr-0">
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-soft text-brand-on-soft">
              <span aria-hidden="true" className="material-symbols-outlined text-2xl">account_balance</span>
            </div>
            <DialogTitle className="text-xl font-semibold leading-tight text-foreground">
              ข้อมูลก่อนเข้าใช้งาน PCOR
            </DialogTitle>
            <DialogDescription className="leading-relaxed">
              กรุณาระบุวิทยาลัยและชื่อ–นามสกุล เพื่อเริ่มใช้งานระบบบริการสมาชิกวิชาชีพ
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleEntryProfile} noValidate>
            <div className="space-y-1.5">
              <label htmlFor="entry-college" className="text-sm font-semibold text-foreground/80">
                วิทยาลัย <span aria-hidden="true" className="text-destructive">*</span>
              </label>
              <select
                ref={collegeSelectRef}
                id="entry-college"
                value={collegeCode}
                onChange={(event) => setCollegeCode(event.target.value as CollegeCode | "")}
                required
                aria-required="true"
                aria-invalid={hasCollegeError}
                aria-describedby={hasCollegeError ? "entry-profile-error" : undefined}
                className="h-11 w-full rounded-2xl border border-transparent bg-input/50 px-3 text-sm text-foreground outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20"
              >
                <option value="" disabled>เลือกวิทยาลัย</option>
                {COLLEGE_OPTIONS.map((college) => (
                  <option key={college.value} value={college.value}>{college.name}</option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <label htmlFor="entry-first-name" className="text-sm font-semibold text-foreground/80">
                  ชื่อ <span aria-hidden="true" className="text-destructive">*</span>
                </label>
                <Input
                  ref={firstNameRef}
                  id="entry-first-name"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  autoComplete="given-name"
                  placeholder="กรอกชื่อ"
                  required
                  aria-required="true"
                  aria-invalid={hasFirstNameError}
                  aria-describedby={hasFirstNameError ? "entry-profile-error" : undefined}
                  className="h-11 px-3"
                />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="entry-last-name" className="text-sm font-semibold text-foreground/80">
                  นามสกุล <span aria-hidden="true" className="text-destructive">*</span>
                </label>
                <Input
                  ref={lastNameRef}
                  id="entry-last-name"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  autoComplete="family-name"
                  placeholder="กรอกนามสกุล"
                  required
                  aria-required="true"
                  aria-invalid={hasLastNameError}
                  aria-describedby={hasLastNameError ? "entry-profile-error" : undefined}
                  className="h-11 px-3"
                />
              </div>
            </div>

            {entryError && (
              <p id="entry-profile-error" role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                {entryError}
              </p>
            )}

            <p className="text-xs leading-relaxed text-muted-foreground">
              ข้อมูลนี้ใช้เพื่อระบุผู้ทดลองใช้งานในรอบการใช้งานนี้เท่านั้น
            </p>

            <DialogFooter className="pt-1">
              <Button type="submit" size="lg" className="w-full sm:w-auto">
                ดำเนินการต่อ
                <span aria-hidden="true" className="material-symbols-outlined text-base">arrow_forward</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
    </>
  );
}
