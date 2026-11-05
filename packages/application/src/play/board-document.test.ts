import { BOARD_SHAPES, deal, defaultLayout, POEMS } from "@karuta/domain";
import fc from "fast-check";
import { expect, test } from "vitest";
import { MemoryRepository } from "../test-support/memory-repository";
import {
  boardDocument,
  loadBoard,
  readBoardDocument,
  saveBoard,
} from "./board-document";

const ALL = POEMS.map((poem) => poem.id);

const SHAPE = BOARD_SHAPES[0] ?? { rows: 6, columns: 11 };
const BOARD = deal(ALL, defaultLayout(SHAPE), () => 0);

const documentWith = (board: unknown) => ({ version: 1, board });

test("仕様 08 §2.2 保存した盤面の文書を読むと、どの形の盤面も元に戻る（JSON を通しても）", () => {
  fc.assert(
    fc.property(
      fc.constantFrom(...BOARD_SHAPES),
      fc.nat({ max: 1000 }),
      (shape, seed) => {
        const board = deal(ALL, defaultLayout(shape), (bound) => seed % bound);
        const saved: unknown = JSON.parse(JSON.stringify(boardDocument(board)));
        expect(readBoardDocument(saved)).toEqual(board);
      },
    ),
  );
});

test("仕様 08 §2.2 §2.4 読めない文書は、盤面がないものとして扱う", () => {
  const cells = (length: number) => Array.from({ length }, () => null);
  const valid = boardDocument(BOARD);
  expect(readBoardDocument(valid)).toEqual(BOARD);
  for (const document of [
    undefined,
    null,
    "board",
    { version: 2, board: { rows: 6, columns: 11, cells: cells(66) } },
    documentWith({ rows: 5, columns: 11, cells: cells(55) }),
    documentWith({ rows: 6, columns: 12, cells: cells(72) }),
    documentWith({ rows: 6, columns: 11, cells: cells(65) }),
    documentWith({ rows: 6, columns: 11, cells: "cells" }),
    documentWith({ rows: 6, columns: 11, cells: [0, ...cells(65)] }),
    documentWith({ rows: 6, columns: 11, cells: [101, ...cells(65)] }),
    documentWith({ rows: 6, columns: 11, cells: ["87", ...cells(65)] }),
    documentWith({ rows: 6, columns: 11, cells: [87, 87, ...cells(64)] }),
  ]) {
    expect(readBoardDocument(document)).toBeUndefined();
  }
});

test("仕様 08 §2.2 盤面を保存先に保存して、読む", async () => {
  const repository = new MemoryRepository();
  await expect(loadBoard(repository)).resolves.toBeUndefined();
  await expect(saveBoard(repository, BOARD)).resolves.toBe("saved");
  await expect(loadBoard(repository)).resolves.toEqual(BOARD);
});
