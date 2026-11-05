import { webSettingsRepository } from "@karuta/adapters-web";
import { SettingsScreen, TopScreen, type TopEntry } from "@karuta/ui";
import "@karuta/ui/styles.css";
import { StrictMode, useSyncExternalStore, type ReactNode } from "react";
import { createRoot } from "react-dom/client";

// The composition root: which adapters the screens use, and which screen is
// open. Each screen has its name after "#" (spec 04 §3.2).
const settings = webSettingsRepository(localStorage);

const HASHES = { top: "#/", settings: "#/settings" } as const;

type Screen = keyof typeof HASHES;

// Spec 04 §3.3: an unknown name opens the top screen.
function currentScreen(): Screen {
  return location.hash === HASHES.settings ? "settings" : "top";
}

function subscribe(onChange: () => void): () => void {
  addEventListener("hashchange", onChange);
  return () => {
    removeEventListener("hashchange", onChange);
  };
}

function open(screen: Screen): void {
  location.hash = HASHES[screen];
}

function App(): ReactNode {
  const screen = useSyncExternalStore(subscribe, currentScreen);
  const backToTop = () => {
    open("top");
  };
  switch (screen) {
    case "settings":
      return <SettingsScreen repository={settings} onBackToTop={backToTop} />;
    case "top":
      return (
        <TopScreen
          onOpen={(entry: TopEntry) => {
            open(entry);
          }}
        />
      );
  }
}

const container = document.getElementById("root");
if (container === null) {
  throw new Error("The #root element is missing from index.html");
}
createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
