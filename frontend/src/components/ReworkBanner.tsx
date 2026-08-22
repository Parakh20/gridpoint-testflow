interface ReworkBannerProps {
  reason: string;
}

export function ReworkBanner({ reason }: ReworkBannerProps) {
  return (
    <div role="alert" className="rounded border border-orange-200 bg-orange-50 p-3">
      <p className="text-xs font-semibold text-orange-700 uppercase mb-1">Rework Required</p>
      <p className="text-sm text-orange-900">{reason}</p>
    </div>
  );
}
