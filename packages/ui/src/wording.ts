import type {
  ChoiceOption,
  FieldPath,
  Outcome,
  Settings,
} from "@karuta/application";
import type { UnconvertibleReason } from "@karuta/domain";

// The one table of wording (ADR-0005). Screens and tests look words up here.
// Words are decided in each screen's spec and copied here; when the two
// differ, the spec is right (ADR-0005 §5). The whole table is reviewed in
// stage 5.

const threeDigits = (id: number): string => String(id).padStart(3, "0");

export const WORDING = {
  /** Words used on more than one screen: one word for one action. */
  common: {
    backToTop: "トップへ戻る",
  },
  /** Spec 04 §2, §11. */
  top: {
    title: "競技かるた トレーニング",
    open: {
      "card-flow": "札流し",
      settings: "設定",
    },
  },
  /** Spec 05 §9. */
  cardFlow: {
    title: "札流し",
    progress: "進捗",
    progressText: (finished: number, total: number): string =>
      `${String(finished)} / ${String(total)}`,
    card: (poem: number): string => `歌番号 ${String(poem)} の札`,
    input: "決まり字",
    answer: "答える",
    skip: "スキップ",
    next: "次へ",
    restart: "やり直す",
    correct: "正解",
    wrong: (kimariji: string): string => `不正解：正解は ${kimariji}`,
    /** Spec 05 §4.3, one for each reason (B-22). */
    reasons: {
      mixed: "かなとローマ字が混ざっています。",
      "romaji-not-allowed": "ローマ字入力は許可されていません。",
      "romaji-unconvertible": "かなに直せないローマ字です。",
      "not-kana-or-romaji": "ひらがなかローマ字で入力してください。",
    } satisfies Record<UnconvertibleReason, string>,
    finished: "お疲れさまでした。全問終了です。",
    list: "決まり字一覧",
    openList: "決まり字一覧を開く",
    closeList: "決まり字一覧を閉じる",
    byAsked: "出題順に並べる",
    byKimariji: "決まり字順に並べる",
    row: (poem: number, kimariji: string): string =>
      `#${threeDigits(poem)} ${kimariji}`,
    /** Spec 05 §8.3: the status of a row, and whether it has changed. */
    status: (
      status: "unread" | Outcome,
      changed: boolean,
      finished: boolean,
    ): string => {
      const names = {
        unread: "未読",
        correct: "正解",
        wrong: "誤答",
        skipped: "スキップ",
      } satisfies Record<"unread" | Outcome, string>;
      const change = changed ? (finished ? "変化" : "変化中") : "初期";
      return `${names[status]}・${change}`;
    },
  },
  /** Spec 04 §4 to §11. */
  settings: {
    title: "設定",
    loading: "設定を読み込んでいます。",
    save: "保存",
    reset: "初期値に戻す",
    saved: "保存しました。",
    saveFailed: "保存できませんでした。",
    integerRange: (min: number, max: number): string =>
      `${String(min)}〜${String(max)} の整数を入力してください。`,
    sections: {
      common: "出題の範囲",
      cardFlow: "札流し",
      multiple: "札流し（複数枚）",
      placement: "配置暗記",
      play: "実践練習",
      layouts: "札の配置",
    } satisfies Record<keyof Settings | "layouts", string>,
    /** The name of each item, by its place in the definition. */
    items: {
      "common.limited": "決まり字を限定する（選んだ歌だけを出題する）",
      "cardFlow.orientation": "札の向き",
      "cardFlow.romajiAllowed": "ローマ字入力を許可",
      "cardFlow.kimarijiChange": "決まり字変化を考慮する",
      "cardFlow.autoNext": "回答後に自動で次へ進む",
      "cardFlow.waitMs": "待機時間（ミリ秒）",
      "cardFlow.count": "出題枚数",
      "multiple.orientation": "札の向き",
      "multiple.romajiAllowed": "ローマ字入力を許可",
      "multiple.kimarijiChange": "決まり字変化を考慮する",
      "multiple.autoNext": "回答後に自動で次へ進む",
      "multiple.waitMs": "待機時間（ミリ秒）",
      "multiple.count": "出題枚数",
      "multiple.perQuestion": "同時枚数",
      "multiple.displayMs": "出現時間（ミリ秒）",
      "placement.mode": "出題モード",
      "placement.excludeDead": "空札を除外する",
      "placement.showAnswer": "回答後に正解札を表示",
      "placement.allowCheck": "回答後に札の確認を許可",
      "placement.autoNext": "回答後に自動で次へ進む",
      "placement.waitMs": "待機時間（ミリ秒）",
      "play.excludeDead": "空札を除外する",
      "play.letterIntervalMs": "文字間隔（ミリ秒）",
      "play.autoNext": "回答後に自動で次へ進む",
      "play.waitMs": "待機時間（ミリ秒）",
    } satisfies Record<FieldPath, string>,
    /** The words of each option of the choice items. */
    options: {
      random: "ランダム",
      upright: "正方向",
      "upside-down": "逆さま",
      mixed: "混合",
      individual: "個別",
      group: "グループ",
      always: "する",
      never: "しない",
      "when-correct": "正答時のみ",
      "when-wrong": "誤答時のみ",
    } satisfies Record<ChoiceOption, string>,
    groups: "決まり字（グループ）",
    poems: "決まり字（個別）",
    selectAll: "すべて選ぶ",
    clearAll: "すべて外す",
    poem: (id: number, kimariji: string): string =>
      `#${threeDigits(id)} ${kimariji}`,
    shape: "盤面の形",
    shapeName: (rows: number, columns: number): string =>
      `${String(rows)}段×${String(columns)}列`,
    opponentSide: "相手陣",
    ownSide: "自陣",
    cell: (row: number, column: number): string =>
      `${String(row)}段目 ${String(column)}列目`,
  },
};
