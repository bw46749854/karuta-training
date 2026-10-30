import { test, expect, type Page } from '@playwright/test';
import { DEMO, prepare, narrate, click, frame } from '../support/sample';

// Top-level `const` in playing-karuta.js, reachable by name from page scripts.
declare const playingState: { currentId: number | null };
declare global {
  interface Window { KIMARIJI_ITEMS: { id: number; s: string }[] }
}

type Judgement = { judge: string; cur: number | null; shown: string; visible: number; total: number };

const SIX = [74, 65, 23, 13, 31, 64]; // うか うら つき つく あさぼらけあ あさぼらけう
const interval = DEMO ? 1000 : 300;
const settings = {
  memorizePlacement: { allOrPart: true, selectedIds: SIX, noneCards: new Array(66).fill(false), groupMode: 'group', doOpen: 'correct', canFlip: 'correct' },
  playingKaruta: { allOrPart: true, selectedIds: SIX, noneCards: new Array(66).fill(false), excludeFlag: true, syllableInterval: interval, autoAdvance: false, waitMs: 500 },
};

const reading = (page: Page) => page.evaluate(() => {
  const spans = [...document.querySelectorAll<HTMLElement>('.question span')];
  return { cur: playingState.currentId, visible: spans.filter(s => s.style.visibility === 'visible').length, total: spans.length };
});

/** Records every judgement message together with the question being read at that moment. */
const recordJudgements = (page: Page) => page.evaluate(() => {
  const log: Judgement[] = [];
  (window as unknown as { __judgements: Judgement[] }).__judgements = log;
  const el = document.querySelector('.judge');
  if (!el) return;
  new MutationObserver(() => {
    const judge = el.textContent?.trim() ?? '';
    if (!judge) return;
    const spans = [...document.querySelectorAll<HTMLElement>('.question span')];
    const visible = spans.filter(s => s.style.visibility === 'visible');
    log.push({ judge, cur: playingState.currentId, shown: visible.map(s => s.textContent).join(''), visible: visible.length, total: spans.length });
  }).observe(el, { childList: true, characterData: true, subtree: true });
});
const judgements = (page: Page) => page.evaluate(() => (window as unknown as { __judgements: Judgement[] }).__judgements);
const cellBox = (page: Page, id: number | null) => page.locator(`#grid .cell[data-cid="${id}"]`).boundingBox();

test.describe('実践練習', () => {
  test('読んでいる途中で「次へ進む」を押しても、次の問は読み終わってから判定される（取扱説明書 §5.8）', async ({ page, context }) => {
    test.fail(true, '現行サンプルの既知の不具合（取扱説明書 §5.8）。修正したらこの行を消す');
    await prepare(context, { settings, seed: 4 });

    await page.goto('/memorize-placement.html');
    await narrate(page, 'デモ：実践練習のバグ再現', '読んでいる途中で「次へ進む」を押すと判定が狂う（取扱説明書 §5.8）', 4000);
    await narrate(page, '① 配置暗記の画面', '札を6枚に限定して配っています（上3枚が相手陣、下3枚が自陣）', 4000);
    await narrate(page, '② 「プレイ開始」を押して実践練習へ');
    await click(page, '#startPlaying');
    await page.waitForURL(/playing-karuta/);
    await page.waitForFunction(() => typeof playingState !== 'undefined' && playingState.currentId !== null);
    await recordJudgements(page);

    const first = (await reading(page)).cur;
    await narrate(page, '③ 1問目：決まり字が1文字ずつ表示されます（右側）', `文字間隔は ${interval / 1000} 秒`);
    await page.waitForFunction(() => [...document.querySelectorAll<HTMLElement>('.question span')].filter(s => s.style.visibility === 'visible').length >= 2);
    await frame(page, await cellBox(page, first), '#2563eb', '途中で飛ばす1問目の札');
    await narrate(page, '④ 読んでいる途中（2文字目）で「次へ進む」を押します', '本来は、この問を飛ばして次の問へ進むだけのはず');
    await click(page, '#nextPlaying');

    await page.waitForFunction(f => playingState.currentId !== f, first);
    const second = (await reading(page)).cur;
    await frame(page, await cellBox(page, second), '#16a34a', '2問目の札');
    await narrate(page, '⑤ 2問目の読み上げが始まりました', '何もタップせずに、読み終わるまで待ちます');

    // Watch until the second question has been read and judged, and until the skipped first question's
    // reading would also have finished (a leftover timer can fire either before or after), narrating each judgement.
    const firstLength = await page.evaluate(id => window.KIMARIJI_ITEMS.find(k => k.id === id)?.s.length ?? 6, first);
    let seen = 0;
    let deadline = Date.now() + 60_000;
    let settling = false;
    while (Date.now() < deadline) {
      const log = await judgements(page);
      for (const j of log.slice(seen)) {
        seen++;
        if (j.cur !== second) continue;
        if (j.visible < j.total) await narrate(page, `⑥ バグ：2問目はまだ「${j.shown}」の途中なのに「${j.judge}」と判定`, '1問目の時間管理が止まらず、2問目の札が判定されて場から消えた', 5500);
        else if (j.judge.includes('空札')) await narrate(page, `⑦ バグ：同じ2問目の札が、今度は「${j.judge}」になった`, '札がすでに場から消えていたため、空札（場にない札）として扱われた', 6500);
        else await narrate(page, `判定：「${j.judge}」`, '読み終わってから判定された（正しい動き）', 4000);
      }
      if (!settling && log.some(j => j.cur === second && j.visible === j.total)) {
        settling = true;
        deadline = Date.now() + (firstLength + 2) * interval;
      }
      await page.waitForTimeout(100);
    }

    const forSecond = (await judgements(page)).filter(j => j.cur === second);
    expect.soft(forSecond[0]?.visible, '2問目が読み終わる前に判定された').toBe(forSecond[0]?.total);
    expect.soft(forSecond.map(j => j.judge), '2問目（場にある札・タップなし）の判定は「時間Over」の1回だけのはず').toEqual(['不正解:時間Over']);

    await narrate(page, '⑧ 途中で飛ばした1問目の札（青枠）は、判定されずに場に残ったまま', '飛ばした札をどう扱うべきかは要確認（取扱説明書 §5.8）', 7000);
    await narrate(page, 'デモ終了', '', 3000);
  });
});
