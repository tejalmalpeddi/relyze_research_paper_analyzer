"use client";

import { useEffect, useRef, useState } from "react";
import Popup from "@/components/popups/popup";
// TODO: pass PDF to backend and open popups

export default function UploadPDF() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const padRef = useRef<HTMLFormElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [scale, setScale] = useState(1);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
    }
  }

  function handleDrop(e: React.DragEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsDraggingOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type === "application/pdf") {
      setFileName(file.name);
    }
  }

  return (
    <form
      ref={padRef}
      onSubmit={(e) => e.preventDefault()}
      onClick={() => fileInputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingOver(true);
      }}
      onDragLeave={() => setIsDraggingOver(false)}
      onDrop={handleDrop}
      className="relative aspect-3/4 h-full bg-contain bg-center bg-no-repeat cursor-pointer flex flex-col items-center justify-center text-white"
      style={{ backgroundImage: "url('/interface/leather-pad.png')" }}
    >
        <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={handleFileChange}
        className="hidden"
        />
        <h2>Upload PDF</h2>
        <img src="/icons/upload.svg" alt="upload icon" className="h-[5rem] mt-[1rem]" />
        {isDraggingOver && <p>Drop PDF here</p>}
        {fileName !== null && (
          <Popup type="uploading" uploadId={fileName} onClose={() => setFileName(null)} />
        )}
    </form>
  );
}
