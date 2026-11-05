import type { CardFlowView, ListOrder } from "@karuta/application";
import { useState, type ReactNode } from "react";
import { WORDING } from "./wording";

const C = WORDING.cardFlow;

/** Spec 05 §8: closed at first; two orders, kimariji order at first. */
export function KimarijiList(props: {
  readonly list: CardFlowView["list"];
}): ReactNode {
  const [open, setOpen] = useState(false);
  const [order, setOrder] = useState<ListOrder>("kimariji");
  return (
    <div className="kimariji-list">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="kimariji-list"
        onClick={() => {
          setOpen(!open);
        }}
      >
        {open ? C.closeList : C.openList}
      </button>
      {open ? (
        <section id="kimariji-list" aria-label={C.list}>
          <button
            type="button"
            onClick={() => {
              setOrder(order === "kimariji" ? "asked" : "kimariji");
            }}
          >
            {order === "kimariji" ? C.byAsked : C.byKimariji}
          </button>
          <ol>
            {props.list[order].map((row) => (
              <li key={row.poem} className={`row-${row.status}`}>
                <span>{C.row(row.poem, row.kimariji)}</span>{" "}
                <span>
                  {C.status(row.status, row.changed, row.status !== "unread")}
                </span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </div>
  );
}
