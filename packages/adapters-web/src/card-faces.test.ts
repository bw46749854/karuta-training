import { expect, test } from "vitest";
import { poemIdForTest } from "./test-support/poems";
import { cardFaceProviderContract } from "./test-support/contracts";
import { numberCardFaces } from "./card-faces";

cardFaceProviderContract(numberCardFaces);

test("指示書 §4 仮の札面は歌番号だけを出し、決まり字を出さない", async () => {
  await expect(numberCardFaces().face(poemIdForTest(87))).resolves.toEqual({
    kind: "text",
    text: "87",
  });
});
