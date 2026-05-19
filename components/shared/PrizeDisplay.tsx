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
    <div className="text-center space-y-2">
      <div className="text-sm uppercase tracking-wider text-zinc-500">
        {isLoss ? "Result" : "You won"}
      </div>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="mx-auto h-32 object-contain" />
      ) : null}
      <h2 className="text-2xl font-bold">{name}</h2>
      {description ? <p className="text-zinc-600">{description}</p> : null}
    </div>
  );
}
