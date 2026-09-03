"use client";

import React, { useState, useRef, useEffect } from "react";
import { CanvasNode } from "@/lib/canvas/types";

export interface CanvasAnnotationNodeProps {
  node: CanvasNode;
  isSelected: boolean;
  isMultiSelected?: boolean;
  onSelect: (node: CanvasNode, isShiftKey?: boolean) => void;
  onDragStart: (node: CanvasNode, e: React.PointerEvent) => void;
  onDragEnd: () => void;
  onUpdateAnnotation?: (nodeId: string, content: string) => void;
}

const ANNOTATION_COLORS: Record<string, string> = {
  yellow: "bg-yellow-100/90 dark:bg-yellow-900/60 border-yellow-200 dark:border-yellow-700/50 text-yellow-900 dark:text-yellow-100",
  blue: "bg-blue-100/90 dark:bg-blue-900/60 border-blue-200 dark:border-blue-700/50 text-blue-900 dark:text-blue-100",
  green: "bg-green-100/90 dark:bg-green-900/60 border-green-200 dark:border-green-700/50 text-green-900 dark:text-green-100",
  pink: "bg-pink-100/90 dark:bg-pink-900/60 border-pink-200 dark:border-pink-700/50 text-pink-900 dark:text-pink-100",
  gray: "bg-neutral-100/90 dark:bg-neutral-800/60 border-neutral-200 dark:border-neutral-700/50 text-neutral-900 dark:text-neutral-100",
};

export default function CanvasAnnotationNode({
  node,
  isSelected,
  isMultiSelected = false,
  onSelect,
  onDragStart,
  onDragEnd,
  onUpdateAnnotation,
}: CanvasAnnotationNodeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const content = node.annotation_metadata?.content || "";
  const [editedContent, setEditedContent] = useState(content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing) {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(editedContent.length, editedContent.length);
    }
  }, [isEditing, editedContent.length]);

  const color = node.annotation_metadata?.color || "yellow";
  const colorStyles = ANNOTATION_COLORS[color] || ANNOTATION_COLORS.yellow;

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    onSelect(node, e.shiftKey);
    onDragStart(node, e);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
    onDragEnd();
  };

  const handleCommitContent = () => {
    setIsEditing(false);
    if (editedContent !== content && onUpdateAnnotation) {
      onUpdateAnnotation(node.id, editedContent);
    } else {
      setEditedContent(content);
    }
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{
        transform: `translate3d(${node.position_x}px, ${node.position_y}px, 0)`,
        width: `${node.width || 200}px`,
        minHeight: `${node.height || 150}px`,
      }}
      className={`absolute top-0 left-0 cursor-move rounded-md border p-3 shadow-sm backdrop-blur-md transition-shadow duration-150 ${colorStyles} ${
        isSelected || isMultiSelected
          ? "ring-2 ring-neutral-900/20 shadow-md dark:ring-emerald-500/30"
          : "hover:shadow-md"
      }`}
    >
      <div 
        className="w-full h-full min-h-[100px]"
        onDoubleClick={(e) => {
          e.stopPropagation();
          setIsEditing(true);
        }}
      >
        {isEditing ? (
          <textarea
            ref={textareaRef}
            data-no-drag="true"
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            onBlur={handleCommitContent}
            onKeyDown={(e) => {
              if (e.key === "Escape" || (e.key === "Enter" && e.shiftKey)) {
                e.preventDefault();
                handleCommitContent();
              }
            }}
            className="w-full h-full min-h-[100px] resize-none bg-transparent outline-none font-medium text-sm leading-relaxed"
            placeholder="Type your note here..."
          />
        ) : (
          <div className="w-full h-full whitespace-pre-wrap font-medium text-sm leading-relaxed cursor-text select-none">
            {content || <span className="opacity-50 italic">Double-click to edit...</span>}
          </div>
        )}
      </div>
    </div>
  );
}
