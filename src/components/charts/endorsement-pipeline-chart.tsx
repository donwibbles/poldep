"use client";

interface PipelineStage {
  name: string;
  color: string;
  count: number;
  isFinal?: boolean;
}

interface EndorsementPipelineChartProps {
  data: PipelineStage[];
}

export function EndorsementPipelineChart({ data }: EndorsementPipelineChartProps) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-gray-500">No pipeline stages configured.</p>;
  }

  return (
    <div className="space-y-2">
      {data.map((stage) => (
        <div key={stage.name} className="flex items-center justify-between py-1.5">
          <div className="flex items-center gap-2">
            <span
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: stage.color }}
            />
            <span className="text-sm">{stage.name}</span>
          </div>
          <span className="text-sm font-medium tabular-nums">{stage.count}</span>
        </div>
      ))}
    </div>
  );
}
