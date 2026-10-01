import Link from "next/link";
import Image from "next/image";
import { Mail } from "lucide-react";

const socialIconProps = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

function InstagramIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} {...socialIconProps}>
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

function LinkedinIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} {...socialIconProps}>
      <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" />
      <rect width="4" height="12" x="2" y="9" />
      <circle cx="4" cy="4" r="2" />
    </svg>
  );
}

function YoutubeIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} {...socialIconProps}>
      <path d="M2.5 17a24.12 24.12 0 0 1 0-10 2 2 0 0 1 1.4-1.4 49.56 49.56 0 0 1 16.2 0A2 2 0 0 1 21.5 7a24.12 24.12 0 0 1 0 10 2 2 0 0 1-1.4 1.4 49.55 49.55 0 0 1-16.2 0A2 2 0 0 1 2.5 17" />
      <path d="m10 15 5-3-5-3z" />
    </svg>
  );
}

const footerLinks = {
  quickLinks: [
    { label: "Privacy Policy", href: "/privacy-policy" },
    { label: "Terms of Service", href: "/terms-of-service" },
    { label: "Company Profile", href: "/about" },
    { label: "Research & Partnership", href: "/research-partnership" },
    { label: "Jaringan Distributor", href: "/distributors" },
    { label: "Careers", href: "/careers" },
    { label: "Customer Support", href: "/contact" },
  ],
  services: [
    { label: "IoT Telemetry & Monitoring", href: "/services#iot-monitoring" },
    { label: "Lab Furniture & Engineering", href: "/services#lab-engineering" },
    { label: "Calibration & Maintenance", href: "/services#calibration" },
    { label: "Water Treatment Systems", href: "/services#water-treatment" },
  ],
};

export default function Footer() {
  return (
    <footer style={{ backgroundColor: "#0B1F3A" }} className="text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Column 1: Brand */}
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 relative flex items-center justify-center">
                <Image
                  src="/images/logo_aka/LOGO_AKA.jpg"
                  alt="Autentik Logo"
                  width={36}
                  height={36}
                  className="object-contain w-full h-full"
                />
              </div>
              <h3 className="text-xl font-bold text-white tracking-tight">Autentik</h3>
            </Link>
            <p className="text-slate-300 text-sm leading-relaxed">
              PT Autentik Karya Analitika. Industrial technology provider powered by smart IoT integration. Smart Technology is Yours.
            </p>
            <p className="text-slate-400 text-sm">Semarang, Central Java, Indonesia</p>
          </div>

          {/* Column 2: Quick Links */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              Quick Links
            </h4>
            <ul className="space-y-2.5">
              {footerLinks.quickLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-slate-400 text-sm hover:text-[#14B8A6] transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Services */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              Services
            </h4>
            <ul className="space-y-2.5">
              {footerLinks.services.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-slate-400 text-sm hover:text-[#14B8A6] transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4: Connect */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-300">
              Connect
            </h4>
            <div className="flex items-center gap-3">
              <a
                href="https://www.instagram.com/autentik.co.id/?hl=id"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className="w-9 h-9 rounded-md bg-white/10 hover:bg-[#0EA5A0] flex items-center justify-center transition-colors"
              >
                <InstagramIcon size={16} />
              </a>
              <a
                href="https://www.linkedin.com/company/79536809/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="LinkedIn"
                className="w-9 h-9 rounded-md bg-white/10 hover:bg-[#0EA5A0] flex items-center justify-center transition-colors"
              >
                <LinkedinIcon size={16} />
              </a>
              <a
                href="https://www.youtube.com/@autentikkaryaanalitika687"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="YouTube"
                className="w-9 h-9 rounded-md bg-white/10 hover:bg-[#0EA5A0] flex items-center justify-center transition-colors"
              >
                <YoutubeIcon size={16} />
              </a>
              <a
                href="mailto:autentik.info@gmail.com"
                aria-label="Email"
                className="w-9 h-9 rounded-md bg-white/10 hover:bg-[#0EA5A0] flex items-center justify-center transition-colors"
              >
                <Mail size={16} />
              </a>
            </div>
            <p className="text-slate-400 text-sm">autentik.info@gmail.com</p>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-white/10 text-center">
          <p className="text-slate-400 text-sm">
            © 2026 PT Autentik Karya Analitika. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
