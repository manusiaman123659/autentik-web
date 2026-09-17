"use client";

import { useState } from "react";
import { Building2, Handshake, Network, Users } from "lucide-react";
import type { TeamMemberRow, GroupCompanyRow, PartnerRow, DistributionEntityRow } from "@/lib/admin-data";
import TeamTab from "@/components/admin/TeamTab";
import GroupTab from "@/components/admin/GroupTab";
import PartnerTab from "@/components/admin/PartnerTab";
import DistributionTab from "@/components/admin/DistributionTab";

type TabKey = "team" | "groups" | "partners" | "distribution";

const TABS: { key: TabKey; label: string; icon: typeof Users }[] = [
  { key: "team", label: "Tim Internal", icon: Users },
  { key: "groups", label: "Grup Perusahaan", icon: Building2 },
  { key: "partners", label: "Partner", icon: Handshake },
  { key: "distribution", label: "Jaringan Distribusi", icon: Network },
];

export default function RelasiTabs({
  team,
  groups,
  partners,
  distribution,
}: {
  team: TeamMemberRow[];
  groups: GroupCompanyRow[];
  partners: PartnerRow[];
  distribution: DistributionEntityRow[];
}) {
  const [active, setActive] = useState<TabKey>("team");

  const counts: Record<TabKey, number> = {
    team: team.length,
    groups: groups.length,
    partners: partners.length,
    distribution: distribution.length,
  };

  return (
    <div>
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto">
        {TABS.map((t) => {
          const isActive = active === t.key;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActive(t.key)}
              className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 -mb-px whitespace-nowrap transition-colors ${
                isActive
                  ? "border-[#0EA5A0] text-[#0EA5A0]"
                  : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              <Icon size={16} />
              {t.label}
              <span
                className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full text-[11px] font-bold ${
                  isActive
                    ? "bg-[#0EA5A0]/15 text-[#0C8C87] dark:text-teal-300"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                }`}
              >
                {counts[t.key]}
              </span>
            </button>
          );
        })}
      </div>

      <div className="pt-5">
        {active === "team" && <TeamTab team={team} />}
        {active === "groups" && <GroupTab groups={groups} />}
        {active === "partners" && <PartnerTab partners={partners} />}
        {active === "distribution" && <DistributionTab entities={distribution} />}
      </div>
    </div>
  );
}
