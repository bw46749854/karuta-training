import type { CardFace, CardFaceProvider } from "@karuta/application";
import type { Orientation, PoemId } from "@karuta/domain";
import { useEffect, useState, type ReactNode } from "react";
import { WORDING } from "./wording";

/** Loads the face of the card shown, and only that one (principles §3.5). */
function useCardFace(
  faces: CardFaceProvider,
  poem: PoemId,
): CardFace | undefined {
  const [loaded, setLoaded] = useState<{
    readonly poem: PoemId;
    readonly face: CardFace;
  }>();
  useEffect(() => {
    let current = true;
    void faces.face(poem).then((face) => {
      if (current) {
        setLoaded({ poem, face });
      }
    });
    return () => {
      current = false;
    };
  }, [faces, poem]);
  return loaded?.poem === poem ? loaded.face : undefined;
}

/** A taking card. Upside down is turned half a circle (spec 05 §3.3). */
export function TakingCard(props: {
  readonly faces: CardFaceProvider;
  readonly poem: PoemId;
  readonly orientation: Orientation;
}): ReactNode {
  const face = useCardFace(props.faces, props.poem);
  return (
    <div
      role="img"
      aria-label={WORDING.cardFlow.card(props.poem)}
      className={`taking-card ${props.orientation}`}
    >
      <span>{face?.text ?? ""}</span>
    </div>
  );
}
