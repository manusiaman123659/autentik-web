interface BadgeProps {
  children: React.ReactNode;
  color?: "teal" | "blue" | "navy" | "orange" | "purple" | "green";
}

const colorStyles = {
  teal: "bg-[#0EA5A0]/10 text-[#0EA5A0]",
  blue: "bg-blue-50 text-blue-600",
  navy: "bg-[#0B1F3A]/10 text-[#0B1F3A]",
  orange: "bg-orange-50 text-orange-600",
  purple: "bg-purple-50 text-purple-600",
  green: "bg-emerald-50 text-emerald-600",
};

export default function Badge({ children, color = "teal" }: BadgeProps) {
  return (
    <span
      className={`inline-block text-xs font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full ${colorStyles[color]}`}
    >
      {children}
    </span>
  );
}
