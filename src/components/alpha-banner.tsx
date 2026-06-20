export function AlphaBanner() {
  return (
    <div className="border-b border-ignition/20 bg-ignition/10">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-2 gap-y-1 px-6 py-2 text-sm text-cosmic/80">
        <span className="rounded-full bg-ignition px-2 py-0.5 text-xs font-semibold uppercase tracking-wide text-pioneer">
          Alpha
        </span>
        <span>This is a new platform and still in active development — features may change.</span>
      </div>
    </div>
  );
}
