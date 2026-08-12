import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getChatConversation } from "@/lib/admin-data";
import { PageHeader, Card } from "@/components/admin/ui";
import ChatThread from "@/components/admin/ChatThread";

export const metadata: Metadata = {
  title: "Detail Percakapan | Autentik CMS",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdminChatDetailPage({ params }: Props) {
  const { id } = await params;
  const data = await getChatConversation(id);
  if (!data) notFound();

  return (
    <div className="max-w-3xl">
      <PageHeader title="Detail Percakapan" backHref="/admin/chat" />
      <Card className="overflow-hidden">
        <ChatThread
          conversationId={id}
          initialMessages={data.messages}
          initialStatus={data.conversation.status}
        />
      </Card>
    </div>
  );
}
