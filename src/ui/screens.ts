import type { Bindings } from '../core/bindings';
import { TITLE } from '../data/meta';
import { TEXTS } from '../data/texts';
import { keyControlLines, usesShift } from './controlLines';
import { formatTime } from './format';
import type { LayoutMap } from './keyNames';
import { OptionsWindow, type OptionsHandlers, type OptionsValues } from './options';
import { element, fillControls, Screen } from './screen';
import { toggle } from './widgets';

export interface ScreenHandlers extends OptionsHandlers {
  onContinue(): void;
  onNewGame(): void;
  onNextLevel(): void;
  onResume(): void;
  onRetry(): void;
}

/** What the screen between two levels shows. */
export interface LevelDoneView {
  readonly seconds: number;
  readonly bestSeconds: number | null;
  readonly newBest: boolean;
  readonly nextLabel: string;
  readonly nextIntro: string;
}

/** What the final screen shows. The total is null when the run did not start from "New game". */
export interface VictoryView {
  readonly lastLevelSeconds: number;
  readonly totalSeconds: number | null;
  readonly bestTotalSeconds: number | null;
  readonly newBest: boolean;
}

/** A window opened from a menu, and the button of that menu that opened it. */
interface Opened {
  readonly menu: Screen;
  readonly button: HTMLButtonElement;
}

/**
 * Start, pause, between-levels, victory and defeat screens, plus two windows opened from
 * the start and pause menus: "How to play" and the options. No way out of the frame.
 */
export class Screens {
  private readonly start: Screen;
  private readonly pause: Screen;
  private readonly help: Screen;
  private readonly options: OptionsWindow;
  private readonly levelDone: Screen;
  private readonly victory: Screen;
  private readonly defeat: Screen;
  private readonly all: readonly Screen[];
  private readonly startReduce: HTMLInputElement;
  private readonly continueButton: HTMLButtonElement;
  private readonly newGameButton: HTMLButtonElement;
  private readonly startHelp: HTMLButtonElement;
  private readonly startOptions: HTMLButtonElement;
  private readonly pauseHelp: HTMLButtonElement;
  private readonly pauseOptions: HTMLButtonElement;
  private readonly pauseLevel: HTMLParagraphElement;
  private readonly helpKeys: HTMLUListElement;
  private readonly shiftHint: HTMLParagraphElement;
  private readonly levelDoneTime: HTMLParagraphElement;
  private readonly levelDoneBest: HTMLParagraphElement;
  private readonly levelDoneNewBest: HTMLParagraphElement;
  private readonly levelDoneNext: HTMLParagraphElement;
  private readonly levelDoneIntro: HTMLParagraphElement;
  private readonly victoryTotal: HTMLParagraphElement;
  private readonly victoryDetail: HTMLParagraphElement;
  private readonly victoryNewBest: HTMLParagraphElement;
  private readonly defeatLevel: HTMLParagraphElement;
  private bindings: Bindings | null = null;
  private layout: LayoutMap | null = null;
  /** Where "Back" returns to from the open window. */
  private opened: Opened | null = null;

  constructor(container: HTMLElement, handlers: ScreenHandlers) {
    const s = TEXTS.start;

    this.start = new Screen(container, 'start', TITLE, 'h1', null);
    this.start.divider('flashlight');
    this.start.text(s.goal, 'screen__text screen__text--lead');
    this.start.text(TEXTS.touch.landscape, 'screen__text screen__text--small only-portrait');
    const startMain = this.start.row('screen__actions');
    this.continueButton = this.start.button('', 'flashlight', handlers.onContinue, {
      parent: startMain,
    });
    this.newGameButton = this.start.button(s.newGame, 'retry', handlers.onNewGame, {
      parent: startMain,
    });
    const startMore = this.start.row('screen__actions');
    this.startHelp = this.start.button(s.help, 'help', () => this.openHelp(this.start), {
      secondary: true,
      parent: startMore,
    });
    this.startOptions = this.start.button(s.options, 'gear', () => this.openOptions(this.start), {
      secondary: true,
      parent: startMore,
    });
    // The light notice keeps its switch beside it: the first screen must offer it.
    const notice = this.start.row('screen__notice');
    notice.append(element('p', 'screen__text screen__text--small', s.lightNotice));
    this.startReduce = toggle(
      notice,
      TEXTS.settings.reduceFlicker,
      'flicker',
      handlers.onReduceFlicker,
    );
    this.start.text(s.leave, 'screen__text screen__text--small only-keys');

    this.pause = new Screen(container, 'pause', TEXTS.pause.title, 'h2', 'pause');
    this.pauseLevel = this.pause.text('', 'screen__text screen__text--small');
    this.pause.button(TEXTS.pause.resume, 'resume', handlers.onResume);
    const pauseMore = this.pause.row('screen__actions');
    this.pauseHelp = this.pause.button(s.help, 'help', () => this.openHelp(this.pause), {
      secondary: true,
      parent: pauseMore,
    });
    this.pauseOptions = this.pause.button(s.options, 'gear', () => this.openOptions(this.pause), {
      secondary: true,
      parent: pauseMore,
    });
    this.pause.text(s.leave, 'screen__text screen__text--small only-keys');

    this.help = new Screen(container, 'help', TEXTS.help.title, 'h2', 'help');
    this.help.onEscape(() => this.back());
    this.help.text(s.light, 'screen__text screen__text--lead');
    this.helpKeys = this.help.controls(s.controlsTitle, 'only-keys');
    fillControls(this.help.controls(s.controlsTitle, 'only-touch'), TEXTS.touch.controls, s.or);
    this.shiftHint = this.help.text(s.shiftHint, 'screen__text screen__text--small only-keys');
    this.help.button(TEXTS.options.back, 'back', () => this.back(), { secondary: true });

    this.options = new OptionsWindow(container, handlers, () => this.back());

    const done = TEXTS.levelDone;
    this.levelDone = new Screen(container, 'level', done.title, 'h2', 'door');
    this.levelDoneTime = this.levelDone.text('', 'screen__text screen__text--lead');
    this.levelDoneBest = this.levelDone.text('', 'screen__text screen__text--small');
    this.levelDoneNewBest = this.levelDone.text(done.newBest, 'screen__note');
    this.levelDone.divider('flashlight');
    this.levelDoneNext = this.levelDone.text('', 'screen__text screen__text--lead');
    this.levelDoneIntro = this.levelDone.text('');
    this.levelDone.button(done.next, 'resume', handlers.onNextLevel, { guarded: true });

    this.victory = new Screen(container, 'victory', TEXTS.victory.title, 'h2', 'door');
    this.victoryTotal = this.victory.text('', 'screen__text screen__text--lead');
    this.victoryDetail = this.victory.text('', 'screen__text screen__text--small');
    this.victoryNewBest = this.victory.text(TEXTS.victory.newBest, 'screen__note');
    this.victory.button(TEXTS.victory.again, 'retry', handlers.onNewGame, { guarded: true });

    this.defeat = new Screen(container, 'defeat', TEXTS.defeat.title, 'h2', 'eyes');
    this.defeatLevel = this.defeat.text('', 'screen__text screen__text--small');
    this.defeat.text(TEXTS.defeat.hint, 'screen__text screen__text--lead');
    this.defeat.button(TEXTS.defeat.retry, 'retry', handlers.onRetry, { guarded: true });

    this.all = [
      this.start,
      this.pause,
      this.help,
      this.options.screen,
      this.levelDone,
      this.victory,
      this.defeat,
    ];
  }

  /** Shows the current settings everywhere they appear, without calling any handler. */
  update(values: OptionsValues): void {
    this.startReduce.checked = values.reduceFlicker;
    this.options.update(values);
    this.bindings = values.keyBindings;
    this.refreshKeys();
  }

  /** Names of the keys as printed on the player's keyboard, once the browser tells. */
  setLayout(layout: LayoutMap | null): void {
    this.layout = layout;
    this.options.setLayout(layout);
    this.refreshKeys();
  }

  /**
   * `continueLevel` is the level "Continue" would start, or null when there is nothing
   * to continue. Focus is not moved on first load, so the page does not steal focus
   * inside a frame.
   */
  showStart(focus: boolean, continueLevel: number | null): void {
    const canContinue = continueLevel !== null;
    this.continueButton.hidden = !canContinue;
    if (canContinue) {
      const label = this.continueButton.lastElementChild;
      if (label) label.textContent = TEXTS.start.continueGame(continueLevel);
    }
    this.start.focusOn(canContinue ? this.continueButton : this.newGameButton);
    this.showOnly(this.start, focus);
  }

  showPause(focus: boolean, levelLabel: string): void {
    this.pauseLevel.textContent = levelLabel;
    this.showOnly(this.pause, focus);
  }

  showLevelDone(view: LevelDoneView): void {
    const done = TEXTS.levelDone;
    this.levelDoneTime.textContent = done.time + formatTime(view.seconds);
    this.levelDoneBest.textContent =
      view.bestSeconds === null ? '' : done.best + formatTime(view.bestSeconds);
    this.levelDoneNewBest.hidden = !view.newBest;
    this.levelDoneNext.textContent = view.nextLabel;
    this.levelDoneIntro.textContent = view.nextIntro;
    this.showOnly(this.levelDone, true);
  }

  showVictory(view: VictoryView): void {
    const v = TEXTS.victory;
    if (view.totalSeconds === null) {
      this.victoryTotal.textContent = v.lastLevel + formatTime(view.lastLevelSeconds);
      this.victoryDetail.textContent = v.fullRunHint;
    } else {
      this.victoryTotal.textContent = v.total + formatTime(view.totalSeconds);
      this.victoryDetail.textContent =
        view.bestTotalSeconds === null ? '' : v.bestTotal + formatTime(view.bestTotalSeconds);
    }
    this.victoryNewBest.hidden = !view.newBest;
    this.showOnly(this.victory, true);
  }

  showDefeat(levelLabel: string): void {
    this.defeatLevel.textContent = levelLabel;
    this.showOnly(this.defeat, true);
  }

  hideAll(): void {
    this.opened = null;
    this.options.hide();
    for (const screen of this.all) screen.hide();
  }

  private openHelp(menu: Screen): void {
    this.opened = { menu, button: menu === this.start ? this.startHelp : this.pauseHelp };
    this.showOnly(this.help, true);
  }

  private openOptions(menu: Screen): void {
    this.opened = { menu, button: menu === this.start ? this.startOptions : this.pauseOptions };
    for (const screen of this.all) screen.hide();
    this.options.show(true);
  }

  /** Closes the open window and gives focus back to the button that opened it. */
  private back(): void {
    const opened = this.opened;
    if (!opened) return;
    this.opened = null;
    this.options.hide();
    this.help.hide();
    opened.menu.show(false);
    opened.button.focus();
  }

  private refreshKeys(): void {
    if (!this.bindings) return;
    fillControls(this.helpKeys, keyControlLines(this.bindings, this.layout), TEXTS.start.or);
    this.shiftHint.hidden = !usesShift(this.bindings);
  }

  private showOnly(target: Screen, focus: boolean): void {
    if (target !== this.help) this.opened = null;
    this.options.hide();
    for (const screen of this.all) if (screen !== target) screen.hide();
    target.show(focus);
  }
}
