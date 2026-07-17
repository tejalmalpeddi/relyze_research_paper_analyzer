"use client";


{/* TODO: replace with Niharika's paper preview */}


type PaperPreviewProps = {
  title?: string;
};

export default function PaperPreview({ title = "Paper title" }: PaperPreviewProps) {
  return (
    <div className="w-[300px] h-[400px] bg-white"></div>
  );
}
