import {
  loadSettings,
  runSession,
  type CardFaceProvider,
  type Clock,
  type PracticeMode,
  type Random,
  type Scheduler,
  type Session,
  type Settings,
  type SettingsRepository,
} from "@karuta/application";
import { useEffect, useState } from "react";

/** The ports the practice screens use, chosen by the composition root. */
export interface PracticePorts {
  readonly settings: SettingsRepository;
  readonly random: Random;
  readonly clock: Clock;
  readonly scheduler: Scheduler;
  readonly faces: CardFaceProvider;
}

/**
 * Runs one session of a practice mode with the saved settings (ADR-0003 §7,
 * ADR-0004). A new round starts from new questions (ADR-0004 §6); leaving
 * the screen cancels every timer.
 */
export function usePracticeSession<Input, State, Command, Timer, View>(
  mode: PracticeMode<Input, State, Command, Timer, View>,
  inputOf: (settings: Settings, random: Random) => Input,
  ports: PracticePorts & { readonly round: number },
): { readonly session?: Session<Command, View>; readonly view?: View } {
  const [settings, setSettings] = useState<Settings>();
  const [running, setRunning] = useState<{
    readonly session: Session<Command, View>;
    readonly view: View;
  }>();
  useEffect(() => {
    let open = true;
    void loadSettings(ports.settings).then((loaded) => {
      if (open) {
        setSettings(loaded);
      }
    });
    return () => {
      open = false;
    };
  }, [ports.settings]);
  const { random, round } = ports;
  useEffect(() => {
    if (settings === undefined) {
      return undefined;
    }
    const session = runSession(mode, inputOf(settings, random), ports);
    setRunning({ session, view: session.view() });
    const unsubscribe = session.subscribe((view) => {
      setRunning({ session, view });
    });
    return () => {
      unsubscribe();
      session.dispose();
    };
    // The clock and the scheduler come with the ports, which the
    // composition root makes once, so they are not listed here.
  }, [settings, mode, inputOf, random, round]);
  return running ?? {};
}
