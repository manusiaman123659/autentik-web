import Link from "next/link";
import Image from "next/image";
import { Mail, Share2 } from "lucide-react";

const footerLinks = {
  quickLinks: [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
    { label: "ISO Certification", href: "/about" },
    { label: "Careers", href: "/news" },
    { label: "Customer Support", href: "/contact" },
  ],
  services: [
    { label: "IoT Telemetry & Monitoring", href: "/solutions#iot-monitoring" },
    { label: "Lab Furniture & Engineering", href: "/solutions#lab-engineering" },
    { label: "Calibration & Maintenance", href: "/solutions#calibration" },
    { label: "Water Treatment Systems", href: "/solutions#water-treatment" },
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
                  src="/images/logo_aka/akaaaaaaa.png"
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
                href="#"
                aria-label="Share"
                className="w-9 h-9 rounded-md bg-white/10 hover:bg-[#0EA5A0] flex items-center justify-center transition-colors"
              >
                <Share2 size={16} />
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
