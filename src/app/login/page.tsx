import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="relative min-h-screen flex items-center justify-center bg-zinc-950 overflow-hidden px-4 sm:px-6 lg:px-8">
      
      {/* Ambient Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/15 blur-[120px] rounded-full pointer-events-none" />
      
      {/* Decorative Grid (Optional, adds a subtle texture) */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none" />

      {/* Glassmorphism Card */}
      <div className="relative z-10 max-w-md w-full space-y-8 bg-zinc-900/60 backdrop-blur-2xl p-8 sm:p-10 rounded-2xl border border-white/10 shadow-2xl shadow-black/50">
        
        {/* Header Section */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center gap-2 mb-4">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-lg font-black text-white shadow-lg shadow-blue-500/30">
              QF
            </span>
          </div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">
            QuoteFlow
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Enterprise B2B Quotation Management
          </p>
        </div>
        
        <LoginForm />
        
        {/* Footer Links */}
        <div className="text-center mt-6">
          <p className="text-xs text-zinc-500">
            Protected by enterprise-grade security. <br className="hidden sm:block" />
            Unauthorized access is strictly prohibited.
          </p>
        </div>
      </div>
    </div>
  );
}