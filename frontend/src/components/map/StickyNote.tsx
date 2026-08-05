"use client";

import { useState, useRef, useEffect } from "react";
import { NodeProps, Node, useReactFlow } from "@xyflow/react";

export interface StickyNoteData extends Record<string, unknown> {
    content: string;
    color: string;
    isEditing?: boolean;
}

export type StickyFlowNode = Node<StickyNoteData, "stickyNote">;

export function StickyNoteNode({ id, data, selected }: NodeProps<StickyFlowNode>) {
    const { setNodes, deleteElements } = useReactFlow();
    const [isEditing, setIsEditing] = useState<boolean>(!!data.isEditing);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);

    // cursor placed + text highlighted
    useEffect(() => {
        if (isEditing && textAreaRef.current) {
            textAreaRef.current.focus();
            textAreaRef.current.select();
        }
    }, [isEditing]);

    // backspace deletion whe selected
    useEffect(() => {
        function handleKeyDown(e: KeyboardEvent) {
            if (selected && !isEditing && (e.key === "Backspace" || e.key === "Delete")) {
                deleteElements({ nodes: [{ id }] });
            }
        }
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [selected, isEditing, id, deleteElements]);

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newContent = e.target.value;
        setNodes((nds) =>
            nds.map((node) =>
                node.id === id
                    ? { ...node, data: { ...node.data, content: newContent } }
                    : node
            )
        );
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if ((e.key === "Enter" && !e.shiftKey) || e.key === "Escape") {
            e.preventDefault();
            setIsEditing(false);
        }
    };

    return (
        <div
            onClick={(e) => {
                e.stopPropagation();
                if (!isEditing) setIsEditing(true);
            }}
            style={{ backgroundColor: data.color, }}
            className={`w-52 h-52 p-3 rounded-lg shadow-xl flex flex-col justify-between transition-all ${
                selected ? "ring-2 ring-stone-900 ring-offset-3" : ""
            }`}
        >
            {isEditing ? (
                <textarea
                    ref={textAreaRef}
                    value={data.content}
                    onChange={handleTextChange}
                    onKeyDown={handleKeyDown}
                    onBlur={() => setIsEditing(false)}
                    placeholder="Type anything"
                    className="w-full h-full bg-transparent resize-none focus:outline-none text-stone-900 font-sans text-sm nodrag nopan"
                />
            ) : (
                <div className="w-full h-full text-stone-900 font-sans text-sm whitespace-pre-wrap overflow-auto">
                    {data.content || <span className="text-stone-600 italic">Type anything</span>}
                </div>
            )}
        </div>
    );
}