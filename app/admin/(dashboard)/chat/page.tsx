import type { Metadata } from "next";
import Link from "next/link";
import { MessagesSquare } from "lucide-react";
import { listChatConversations } from "@/lib/admin-data";
import { PageHeader, Badge, EmptyState, TableShell, Th, Td, formatDateTime } from "@/components/admin/ui";

export const metadata: Metadata = {
  title: "Chat CS | Autentik CMS",
};

export default async function AdminChatPage() {
  const conversations = await listChatConversations();

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Chat CS"
        description="Percakapan live chat visitor dengan tim Autentik"
      />

      {conversations.length === 0 ? (
        <EmptyState
          icon={<MessagesSquare size={26} />}
          title="Belum ada percakapan"
          description="Saat visitor membuka chat dengan CS di website, percakapan akan muncul di sini."
        />
      ) : (
        <TableShell>
          <thead>
            <tr>
              <Th>Visitor</Th>
              <Th>Status</Th>
              <Th>Pesan Terakhir</Th>
              <Th>Aktivitas Terakhir</Th>
            </tr>
          </thead>
          <tbody>
            {conversations.map((c) => (
              <tr
                key={c.id}
                className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors ${
                  c.unread_count > 0 ? "bg-teal-50/40 dark:bg-teal-950/20" : ""
                }`}
              >
                <Td>
                  <Link
                    href={`/admin/chat/${c.id}`}
                    className="font-semibold text-slate-900 dark:text-white hover:text-[#0EA5A0] transition-colors block"
                  >
                    Visitor
                  </Link>
                  <span className="text-xs text-slate-400">#{c.id.slice(0, 8)}</span>
                </Td>
                <Td>
                  <Badge tone={c.status === "open" ? "green" : "slate"}>
                    {c.status === "open" ? "Terbuka" : "Selesai"}
                  </Badge>
                  {c.unread_count > 0 && (
                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full bg-[#0EA5A0]/15 text-[#0C8C87] dark:text-teal-300 text-[11px] font-bold">
                      {c.unread_count} baru
                    </span>
                  )}
                </Td>
                <Td className="max-w-[320px]">
                  <span className="text-sm line-clamp-2 block text-slate-600 dark:text-slate-300">
                    {c.last_message ? (
                      <>
                        <span className="font-semibold text-slate-400">
                          {c.last_sender === "staff" ? "Staf" : "Visitor"}:{" "}
                        </span>
                        {c.last_message}
                      </>
                    ) : (
                      "—"
                    )}
                  </span>
                </Td>
                <Td className="text-xs text-slate-500 dark:text-slate-400">
                  {formatDateTime(c.last_message_at)}
                </Td>
              </tr>
            ))}
          </tbody>
        </TableShell>
      )}
    </div>
  );
}
