"use client";

import { Waypoints } from "lucide-react";
import Dropdown from "@/components/ui/dropdown";
import AWSLogo from "@/components/aws-logo";
import type { AIGenerationMode } from "@/lib/ai/types";

export default function CanvasAIModeSelect({ id, value, onChange, disabled, label = "Generation mode" }: {
  id: string; value: AIGenerationMode; onChange: (value: AIGenerationMode) => void; disabled?: boolean; label?: string;
}) {
  return <Dropdown id={id} aria-label={label} value={value} onChange={value => onChange(value as AIGenerationMode)} disabled={disabled}
    options={[
      { value: "workflow", label: "Workflow", indicator: <Waypoints className="h-4 w-4 shrink-0" /> },
      { value: "aws_architecture", label: "AWS Architecture", indicator: <AWSLogo className="h-5 w-5 shrink-0 text-[#ff9900]" /> },
    ]} />;
}
