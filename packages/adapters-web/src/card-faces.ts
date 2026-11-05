import type { CardFaceProvider } from "@karuta/application";

/**
 * Provisional faces: the poem number only, never the kimariji, which is the
 * answer (the cloud session's brief §4). Stage 5 swaps in the real faces.
 */
export function numberCardFaces(): CardFaceProvider {
  return {
    face: (poem) => Promise.resolve({ kind: "text", text: String(poem) }),
  };
}
