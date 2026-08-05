import Image from "next/image";

interface DetailSpriteProps {
  spriteUrl: string | null;
  /** Nome ja formatado: entra na alternativa textual da imagem. */
  displayName: string;
}

/** Ilustracao do pokemon, com aviso no lugar do buraco quando nao existe sprite. */
export function DetailSprite({ spriteUrl, displayName }: DetailSpriteProps) {
  return (
    <div className="relative aspect-square w-full max-w-xs shrink-0 overflow-hidden rounded-2xl bg-zinc-100 dark:bg-zinc-900">
      {spriteUrl ? (
        <Image
          src={spriteUrl}
          alt={`Ilustracao de ${displayName}`}
          fill
          sizes="(max-width: 640px) 90vw, 320px"
          className="object-contain p-4"
          priority
        />
      ) : (
        <span className="flex h-full items-center justify-center text-sm text-zinc-500">
          Sem imagem
        </span>
      )}
    </div>
  );
}
