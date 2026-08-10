interface SectionHeadingProps {
  title: string;
  subtitle?: string;
  align?: "left" | "center";
  dark?: boolean;
}

export default function SectionHeading({
  title,
  subtitle,
  align = "center",
  dark = false,
}: SectionHeadingProps) {
  return (
    <div className={`mb-12 ${align === "center" ? "text-center" : "text-left"}`}>
      <h2
        className={`text-3xl md:text-4xl font-bold mb-4 ${
          dark ? "text-white" : ""
        }`}
        style={dark ? {} : { color: "var(--text-primary)" }}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className={`text-base md:text-lg max-w-3xl ${
            align === "center" ? "mx-auto" : ""
          } ${dark ? "text-slate-300" : ""}`}
          style={dark ? {} : { color: "var(--text-secondary)" }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}
