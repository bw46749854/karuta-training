import {
  numberCardFaces,
  webBoardRepository,
  webClock,
  webRandom,
  webScheduler,
  webSettingsRepository,
} from "@karuta/adapters-web";
import {
  CardFlowScreen,
  MultipleCardFlowScreen,
  PlacementScreen,
  PlayScreen,
  SettingsScreen,
  TopScreen,
  type PracticePorts,
  type TopEntry,
} from "@karuta/ui";
import "@karuta/ui/styles.css";
import { StrictMode, useSyncExternalStore, type ReactNode } from "react";
import { createRoot } from "react-dom/client";

// The composition root: which adapters the screens use, and which screen is
// open. Each screen has its name after "#" (spec 04 §3.2).
const settings = webSettingsRepository(localStorage);
const practicePorts: PracticePorts = {
  settings,
  boards: webBoardRepository(localStorage),
  random: webRandom(),
  clock: webClock(),
  scheduler: webScheduler(),
  faces: numberCardFaces(),
};

const HASHES = {
  top: "#/",
  "card-flow": "#/card-flow",
  multiple: "#/multiple",
  placement: "#/placement",
  // Spec 08 §7.5: back from the play, with the saved board.
  "placement-again": "#/placement/again",
  play: "#/play",
  settings: "#/settings",
} as const;

type Screen = keyof typeof HASHES;

const SCREENS = new Map<string, string>(
  Object.entries(HASHES).map(([screen, hash]) => [hash, screen]),
);

function isScreen(name: string | undefined): name is Screen {
  return name !== undefined && Object.hasOwn(HASHES, name);
}

// Spec 04 §3.3: an unknown name opens the top screen.
function currentScreen(): Screen {
  const screen = SCREENS.get(location.hash);
  return isScreen(screen) ? screen : "top";
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

// Spec 08 §7.6: once back on the saved board, a reload deals anew.
function resumed(): void {
  history.replaceState(null, "", HASHES.placement);
}

function placement(resume: boolean): ReactNode {
  return (
    <PlacementScreen
      key="placement"
      ports={practicePorts}
      resume={resume}
      onResumed={resumed}
      onPlay={() => {
        open("play");
      }}
      onBackToTop={() => {
        open("top");
      }}
    />
  );
}

function App(): ReactNode {
  const screen = useSyncExternalStore(subscribe, currentScreen);
  const backToTop = () => {
    open("top");
  };
  switch (screen) {
    case "card-flow":
      return <CardFlowScreen ports={practicePorts} onBackToTop={backToTop} />;
    case "multiple":
      return (
        <MultipleCardFlowScreen ports={practicePorts} onBackToTop={backToTop} />
      );
    case "placement":
      return placement(false);
    case "placement-again":
      return placement(true);
    case "play":
      return (
        <PlayScreen
          ports={practicePorts}
          onOpenPlacement={() => {
            open("placement");
          }}
          onFinish={() => {
            open("placement-again");
          }}
          onBackToTop={backToTop}
        />
      );
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
