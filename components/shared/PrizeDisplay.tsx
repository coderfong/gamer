export function PrizeDisplay({
  name,
  description,
  imageUrl,
  isLoss,
}: {
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  isLoss?: boolean;
}) {
  return (
    <div className="text-center space-y-2 animate-[pop-in_0.5s_ease-out]">
      <div className="text-sm uppercase tracking-[0.2em] arcade-muted">
        {isLoss ? "Result" : "🎉 You won 🎉"}
      </div>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="mx-auto h-32 object-contain drop-shadow-lg" />
      ) : null}
      <h2
        className="arcade-title text-3xl"
        style={{ color: isLoss ? "#fff" : "var(--brand-color)" }}
      >
        {name}
      </h2>
      {description ? <p className="arcade-muted">{description}</p> : null}
    </div>
  );
}
