import Link from "next/link";
import { BrandLogo } from "./BrandLogo";

export function AppFooter() {
  return (
    <footer className="mt-auto bg-brand-teal-light text-white">
      <div className="mx-auto grid max-w-[1400px] gap-8 px-4 py-10 md:grid-cols-4 md:px-6">
        <div className="md:col-span-1">
          <BrandLogo size={48} />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/80">
            Fast charging solutions for sustainable mobility across Sri Lanka. Part of St.
            Anthony&apos;s Hardware (Pvt) Ltd.
          </p>
        </div>

        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-widest text-brand-amber">
            Reach Us
          </h4>
          <ul className="space-y-2 text-sm text-white/85">
            <li>+94 11 234 5678</li>
            <li>
              <a href="mailto:info@stanthonys.lk" className="hover:text-white">
                info@stanthonys.lk
              </a>
            </li>
            <li>
              <a href="https://stanthonys.lk" className="hover:text-white">
                stanthonys.lk
              </a>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-widest text-brand-amber">
            Legal
          </h4>
          <ul className="space-y-2 text-sm text-white/85">
            <li>
              <Link href="#" className="hover:text-white">
                Terms of Service
              </Link>
            </li>
            <li>
              <Link href="#" className="hover:text-white">
                Privacy Policy
              </Link>
            </li>
            <li>
              <Link href="#" className="hover:text-white">
                Disclaimer
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-xs font-semibold uppercase tracking-widest text-brand-amber">
            Connectivity
          </h4>
          <p className="text-sm text-white/85">
            Secure OCPP-connected network with real-time availability and session telemetry.
          </p>
          <p className="mt-4 text-xs text-white/60">
            © {new Date().getFullYear()} ST. ANTHONY&apos;S HARDWARE (PVT) LTD
          </p>
        </div>
      </div>
    </footer>
  );
}
