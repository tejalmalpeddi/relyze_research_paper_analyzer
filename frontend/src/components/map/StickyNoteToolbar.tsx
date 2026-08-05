"use client";

import { useState } from "react";

const DEPTH_COLORS = ["#4281a4", "#c1666b", "#7C8A52", "#B08A3E"];

interface StickyToolbarProps {
    onSelectColor: (color: string) => void;
    activeColor: string | null;
}

export function StickyToolbar({ onSelectColor, activeColor }: StickyToolbarProps) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="relative flex items-center gap-2 bg-[#212327] border border-stone-700 p-1.5 rounded-full shadow-lg">
            {/* add sticky note */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-200 text-stone-900 hover:bg-amber-300 font-bold"
                title="Add Sticky Note"
            >
                📄
            </button>

            {/* color palette */}
            {isOpen && (
                <div className="flex items-center gap-1.5 pl-1 pr-2 animate-in fade-in slide-in-from-left-2 duration-150">
                    {DEPTH_COLORS.map((color) => (
                        <button
                            key={color}
                            onClick={() => {
                                onSelectColor(color);
                                setIsOpen(false);
                            }}
                            style={{ backgroundColor: color }}
                            className={`h-6 w-6 rounded-full transition-transform hover:scale-110 border ${
                                activeColor === color ? "ring-2 ring-white scale-110" : "border-stone-600"
                            }`}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
