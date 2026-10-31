import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

// The composition root. Screens are added from stage 4 of the plan.
const container = document.getElementById("root");
if (container === null) {
  throw new Error("The #root element is missing from index.html");
}
createRoot(container).render(
  <StrictMode>
    <main />
  </StrictMode>,
);
