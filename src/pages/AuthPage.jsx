import { useEffect, useMemo, useState } from "react";
import { ArrowLeft } from "@phosphor-icons/react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { signInWithGoogle, signInWithPassword, signUpWithPassword } from "../authService";
import Header from "../components/Header";
import { useAuth } from "../hooks/useAuth";
import "./AuthPage.css";

function getFriendlyErrorMessage(error) {
  const message = String(error?.message || "");

  if (message.includes("Invalid login credentials")) {
    return "بيانات الدخول غير صحيحة. تأكد من البريد الإلكتروني وكلمة المرور.";
  }
  if (message.includes("Email not confirmed")) {
    return "يرجى تأكيد بريدك الإلكتروني أولًا ثم محاولة تسجيل الدخول.";
  }
  if (message.includes("Password should be at least")) {
    return "كلمة المرور يجب أن تكون أطول قليلًا لزيادة الأمان.";
  }
  if (message.includes("User already registered")) {
    return "هذا البريد مستخدم بالفعل. جرّب تسجيل الدخول بدل إنشاء حساب جديد.";
  }
  if (message.includes("provider is not enabled")) {
    return "تسجيل الدخول عبر Google غير مفعّل بعد في إعدادات Supabase.";
  }

  return "تعذرت العملية الآن. حاول مرة أخرى بعد قليل.";
}

function AuthPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading } = useAuth();

  const mode = searchParams.get("mode") === "signup" ? "signup" : "signin";
  const isSignup = mode === "signup";

  const [formState, setFormState] = useState({ fullName: "", email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [oauthSubmitting, setOauthSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!loading && user) {
      navigate("/home", { replace: true });
    }
  }, [loading, user, navigate]);

  useEffect(() => {
    const providerError =
      searchParams.get("error_description") || searchParams.get("error");
    if (!providerError) return;
    setErrorMessage(decodeURIComponent(providerError.replace(/\+/g, " ")));
  }, [searchParams]);

  const pageCopy = useMemo(
    () =>
      isSignup
        ? {
            title: "أنشئ مجلسك التعليمي",
            submitLabel: "إنشاء الحساب",
            switchLabel: "لديك حساب بالفعل؟",
            switchAction: "سجّل الدخول",
            switchMode: "signin",
          }
        : {
            title: "عد إلى مسارك",
            submitLabel: "تسجيل الدخول",
            switchLabel: "ما عندك حساب بعد؟",
            switchAction: "أنشئ حسابًا",
            switchMode: "signup",
          },
    [isSignup],
  );

  function updateField(field, value) {
    setFormState((curr) => ({ ...curr, [field]: value }));
  }

  function clearFeedback() {
    setErrorMessage("");
    setSuccessMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    clearFeedback();

    try {
      if (isSignup) {
        const data = await signUpWithPassword({
          fullName: formState.fullName.trim(),
          email: formState.email.trim(),
          password: formState.password,
        });
        if (data.session) {
          navigate("/home", { replace: true });
          return;
        }
        setFormState((current) => ({
          ...current,
          password: "",
        }));
        setSuccessMessage(
          "تم إنشاء الحساب. افحص بريدك الإلكتروني لتأكيد التسجيل ثم سجّل الدخول.",
        );
      } else {
        await signInWithPassword({
          email: formState.email.trim(),
          password: formState.password,
        });
        navigate("/home", { replace: true });
      }
    } catch (error) {
      setErrorMessage(getFriendlyErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleAuth() {
    setOauthSubmitting(true);
    clearFeedback();
    try {
      await signInWithGoogle();
    } catch (error) {
      setErrorMessage(getFriendlyErrorMessage(error));
      setOauthSubmitting(false);
    }
  }

  const isBusy = submitting || oauthSubmitting;

  return (
    <div className="auth-page" dir="rtl">
      <Header backHref="/" />

      <main className="auth-shell">
        {/* Background blobs */}
        <div className="auth-blob auth-blob--one" aria-hidden="true" />
        <div className="auth-blob auth-blob--two" aria-hidden="true" />

        <section className="auth-card" aria-label={pageCopy.title}>

          {/* Kicker */}
          <span className="auth-kicker">حسابك في تعلّم</span>

          {/* Tab switcher */}
          <div className="auth-tabs" role="tablist" aria-label="وضع الحساب">
            <button
              type="button"
              role="tab"
              aria-selected={!isSignup}
              className={`auth-tab ${!isSignup ? "is-active" : ""}`}
              onClick={() => { clearFeedback(); setSearchParams({ mode: "signin" }); }}
              disabled={isBusy}
            >
              دخول
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isSignup}
              className={`auth-tab ${isSignup ? "is-active" : ""}`}
              onClick={() => { clearFeedback(); setSearchParams({ mode: "signup" }); }}
              disabled={isBusy}
            >
              حساب جديد
            </button>
          </div>

          {/* Heading */}
          <div className="auth-heading">
            <h1 className="auth-title">{pageCopy.title}</h1>
          </div>

          {/* Google OAuth */}
          <button
            type="button"
            className="auth-oauth-btn"
            onClick={handleGoogleAuth}
            disabled={isBusy}
          >
            <span className="auth-oauth-icon" aria-hidden="true">G</span>
            <span className="auth-oauth-label">
              {oauthSubmitting ? "جارٍ التحويل إلى Google..." : "المتابعة باستخدام Google"}
            </span>
          </button>

          {/* Separator */}
          <div className="auth-sep" aria-hidden="true">
            <span>أو استخدم البريد الإلكتروني</span>
          </div>

          {/* Form */}
          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {isSignup ? (
              <label className="auth-field">
                <span>الاسم</span>
                <input
                  type="text"
                  autoComplete="name"
                  value={formState.fullName}
                  onChange={(e) => updateField("fullName", e.target.value)}
                  placeholder="مثال: أحمد محمد"
                  disabled={isBusy}
                />
              </label>
            ) : null}

            <label className="auth-field">
              <span>البريد الإلكتروني</span>
              <input
                type="email"
                autoComplete="email"
                required
                value={formState.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="name@example.com"
                dir="ltr"
                disabled={isBusy}
              />
            </label>

            <label className="auth-field">
              <span>كلمة المرور</span>
              <input
                type="password"
                autoComplete={isSignup ? "new-password" : "current-password"}
                required
                minLength={6}
                value={formState.password}
                onChange={(e) => updateField("password", e.target.value)}
                placeholder="••••••••"
                dir="ltr"
                disabled={isBusy}
              />
            </label>

            {errorMessage ? (
              <p className="auth-msg auth-msg--error" role="alert">{errorMessage}</p>
            ) : null}
            {successMessage ? (
              <p className="auth-msg auth-msg--success" role="status">{successMessage}</p>
            ) : null}

            <button type="submit" className="auth-submit" disabled={isBusy}>
              {submitting ? "جاري التنفيذ..." : pageCopy.submitLabel}
            </button>
          </form>

          {/* Footer actions */}
          <div className="auth-footer">
            <div className="auth-switch">
              <span>{pageCopy.switchLabel}</span>
              <button
                type="button"
                className="auth-switch-btn"
                onClick={() => { clearFeedback(); setSearchParams({ mode: pageCopy.switchMode }); }}
                disabled={isBusy}
              >
                {pageCopy.switchAction}
              </button>
            </div>

            <Link to="/home" className="auth-guest-link">
              <span>التصفح كضيف</span>
              <ArrowLeft weight="duotone" aria-hidden="true" />
            </Link>
          </div>

        </section>
      </main>
    </div>
  );
}

export default AuthPage;
