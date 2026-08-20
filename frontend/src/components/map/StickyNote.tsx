"use client";

import Image from "next/image";
import { useState, useRef, useEffect } from "react";
import { NodeProps, Node, useReactFlow } from "@xyflow/react";
import { editStickyNotes, clearStickyNotes} from "@/lib/api";

export interface StickyNoteData extends Record<string, unknown> {
    content: string;
    color: string;
    isEditing?: boolean;
}

export type StickyFlowNode = Node<StickyNoteData, "stickyNote">;

export function StickyNoteNode({ id, data, selected }: NodeProps<StickyFlowNode>) {
    const { setNodes } = useReactFlow();
    const [isEditing, setIsEditing] = useState<boolean>(!!data.isEditing);
    const [content, setContent] = useState<string>(data.content);
    const textAreaRef = useRef<HTMLTextAreaElement>(null);

    // cursor placed + text highlighted
    useEffect(() => {
        if (isEditing && textAreaRef.current) {
            textAreaRef.current.focus();
            textAreaRef.current.select();
        }
    }, [isEditing]);

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newContent = e.target.value;
        setContent(newContent);
        setNodes((nds) =>
            nds.map((node) =>
                node.id === id
                    ? { ...node, data: { ...node.data, content: newContent } }
                    : node
            )
        );
    };

    const saveChanges = async (nextContent: string) => {
        try {
            await editStickyNotes(data.documentId as string | number, {
                id: id.replace("sticky-", ""),
                content: nextContent,
            });
        } catch (error) {
            console.error("Failed to update sticky note content:", error);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if ((e.key === "Enter" && !e.shiftKey) || e.key === "Escape") {
            e.preventDefault();
            saveChanges(content);
            setIsEditing(false);
        }
    };

    const handleTrashButtonClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await clearStickyNotes(data.documentId as string | number, id.replace("sticky-", ""));
            setNodes((nodes) => nodes.filter((node) => node.id !== id));
        } catch (error) {
            console.error("Failed to delete sticky note:", error);
        }
    };

    return (
        <div
            onClick={(e) => {
                e.stopPropagation();
                if (!isEditing) setIsEditing(true);
            }}
            style={{ backgroundColor: data.color, }}
            className={`w-52 h-52 p-3 rounded-lg shadow-xl flex flex-col justify-between transition-all relative${selected ? "ring-2 ring-stone-900 ring-offset-3" : ""
                }`}
        >
            <button type="button" onClick={handleTrashButtonClick} aria-label="Delete this sticky note" className="absolute bottom-3 right-3">
                <Image style={{"filter":"brightness(100)"}} src="/icons/trash.svg" alt="Delete" width={15} height={15} />
            </button>
            {isEditing ? (
                <textarea
                    ref={textAreaRef}
                    value={content}
                    onChange={handleTextChange}
                    onKeyDown={handleKeyDown}
                    onBlur={() => {
                        saveChanges(content);
                        setIsEditing(false);
                    }}
                    placeholder="Type anything and enter to save"
                    className="w-full h-full bg-transparent resize-none focus:outline-none text-stone-900 font-sans text-sm nodrag nopan pb-15"
                />
            ) : (
                <div className="w-full h-full text-stone-900 font-sans text-sm whitespace-pre-wrap overflow-auto pb-15">
                    {content || <span className="text-stone-600 italic">Type anything and enter to save</span>}
                </div>
            )}
        </div>
    );
}
