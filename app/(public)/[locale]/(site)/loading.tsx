export default function Loading() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-4"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      <div className="w-10 h-10 rounded-full border-2 border-[#0EA5A0] border-t-transparent animate-spin" />
      <p className="text-xs font-medium tracking-wider text-slate-400">
        Memuat konten…
      </p>
    </div>
  );
}
