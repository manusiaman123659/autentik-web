"use client";

import { useState } from "react";
import { FileText, FileDown, HardDrive, Shield, Download, Lock } from "lucide-react";
import { FILE_TYPE_LABELS, type FileType } from "@/lib/validations/rfqSchema";
import GatedDownloadModal from "./GatedDownloadModal";

interface TechDoc {
  id: string;
  title: string;
  file_type: string;
  file_url: string;
  file_size_kb: number | null;
  requires_lead: boolean;
}

const FILE_ICONS: Record<string, typeof FileText> = {
  datasheet: FileText,
  manual: FileDown,
  cad_3d: HardDrive,
  certificate: Shield,
  software_firmware: HardDrive,
};

export default function TechnicalDocsSection({ documents }: { documents: TechDoc[] }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<TechDoc | null>(null);

  if (documents.length === 0) return null;

  function handleDownload(doc: TechDoc) {
    if (doc.requires_lead) {
      setSelectedDoc(doc);
      setModalOpen(true);
    } else {
      window.open(doc.file_url, "_blank");
    }
  }

  function handleModalClose() {
    setModalOpen(false);
    setSelectedDoc(null);
  }

  return (
    <>
      <section
        className="py-12 sm:py-16"
        style={{ backgroundColor: "var(--bg-secondary)" }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2
            className="text-2xl sm:text-3xl font-bold tracking-tight mb-8"
            style={{ color: "var(--text-primary)" }}
          >
            Dokumen Teknis & CAD
          </h2>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => {
              const Icon = FILE_ICONS[doc.file_type] ?? FileText;
              return (
                <button
                  key={doc.id}
                  onClick={() => handleDownload(doc)}
                  className="group text-left rounded-xl border p-5 transition-all hover:shadow-md hover:border-[#0EA5A0]"
                  style={{
                    backgroundColor: "var(--bg-primary)",
                    borderColor: "var(--border-subtle)",
                  }}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: "var(--bg-tertiary)" }}
                    >
                      <Icon size={20} style={{ color: "var(--accent-primary)" }} />
                    </div>
                    {doc.requires_lead ? (
                      <Lock size={14} className="text-amber-500 flex-shrink-0 mt-1" />
                    ) : (
                      <Download size={14} className="text-[#0EA5A0] flex-shrink-0 mt-1" />
                    )}
                  </div>

                  <h3
                    className="text-sm font-bold mb-1 group-hover:text-[#0EA5A0] transition-colors"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {doc.title}
                  </h3>

                  <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                    <span>{FILE_TYPE_LABELS[doc.file_type as FileType] ?? doc.file_type}</span>
                    {doc.file_size_kb && (
                      <>
                        <span>&middot;</span>
                        <span>{doc.file_size_kb} KB</span>
                      </>
                    )}
                  </div>

                  <p className="text-xs mt-3" style={{ color: "var(--text-secondary)" }}>
                    {doc.requires_lead ? "Isi form untuk download" : "Download langsung"}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {selectedDoc && (
        <GatedDownloadModal
          isOpen={modalOpen}
          onClose={handleModalClose}
          documentId={selectedDoc.id}
          documentTitle={selectedDoc.title}
        />
      )}
    </>
  );
}
