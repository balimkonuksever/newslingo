"use client";

import {
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  EXPRESSION_SOURCE_NOTE,
  ExpressionDetails,
} from "@/components/learning/expression-details";
import { fetchDictionaryEntry } from "@/components/learning/lookup-client";
import {
  isWord,
  makeTabStop,
  moveBetweenWords,
  wordPosition,
} from "@/components/learning/word-navigation";
import { secondaryButton } from "@/components/ui/styles";
import type {
  DictionaryEntry,
  DictionaryLookupError,
} from "@/domain/dictionary";
import type { ExpressionCard } from "@/domain/expressions";

type LookupState =
  | { status: "closed" }
  | { status: "loading"; word: string }
  | { status: "found"; word: string; entry: DictionaryEntry }
  | { status: "expression"; word: string; card: ExpressionCard }
  | { status: "failed"; word: string; error: DictionaryLookupError };

/** Space between the word and the card, and between the card and the edges. */
const GAP = 8;
const EDGE = 16;

/**
 * Puts the card below the word, or above it when only that fits. The card is
 * in the top layer with `position: absolute`, so these are page coordinates
 * and it scrolls with the text. On phones the card is a fixed bottom sheet
 * instead, and the page scrolls if the sheet would cover the word.
 */
function placeCard(card: HTMLElement | null, word: HTMLElement | null) {
  if (!card || !word) {
    return;
  }

  const box = word.getBoundingClientRect();

  if (getComputedStyle(card).position === "fixed") {
    const covered = box.bottom + GAP - card.getBoundingClientRect().top;

    if (covered > 0) {
      window.scrollBy({ top: covered, behavior: "instant" });
    }
    return;
  }

  const height = card.offsetHeight;
  const fitsBelow = box.bottom + GAP + height <= window.innerHeight - EDGE;
  const fitsAbove = box.top - GAP - height >= EDGE;
  let top = !fitsBelow && fitsAbove ? box.top - GAP - height : box.bottom + GAP;

  // A card too tall for either side, such as a long expression card, goes
  // below the word, and the page scrolls to show it without hiding the word.
  if (!fitsBelow && !fitsAbove) {
    const scroll = Math.min(
      top + height - (window.innerHeight - EDGE),
      box.top - EDGE,
    );

    if (scroll > 0) {
      window.scrollBy({ top: scroll, behavior: "instant" });
      top -= scroll;
    }
  }
  const maxLeft =
    document.documentElement.clientWidth - card.offsetWidth - EDGE;
  const left = Math.max(EDGE, Math.min(box.left, maxLeft));

  card.style.setProperty("--lookup-top", `${top + window.scrollY}px`);
  card.style.setProperty("--lookup-left", `${left + window.scrollX}px`);
}

/**
 * Makes the English words in `children` explorable: a click, tap, Enter or
 * Space on a word opens a card with its meaning in this sentence. The card is
 * a popover beside the word on wide screens and a bottom sheet on phones. No
 * lookup happens until a reader asks for one. A marked Real English
 * expression opens its card from `expressions`, which the page already
 * holds, so it costs no request.
 */
export function WordLookup({
  articleSlug,
  expressions = [],
  children,
}: {
  articleSlug: string;
  expressions?: readonly ExpressionCard[];
  children: ReactNode;
}) {
  const [state, setState] = useState<LookupState>({ status: "closed" });
  const cards = useMemo(
    () => new Map(expressions.map((card) => [card.slug, card])),
    [expressions],
  );
  const cardRef = useRef<HTMLDivElement>(null);
  const activeWordRef = useRef<HTMLElement | null>(null);
  const requestRef = useRef<AbortController | null>(null);
  // Entries already shown on this page, so a second look costs no request.
  const entriesRef = useRef(new Map<string, DictionaryEntry>());
  const headingId = useId();

  // The card's height changes as its content loads, so place it again.
  useLayoutEffect(() => {
    placeCard(cardRef.current, activeWordRef.current);
  }, [state]);

  useEffect(() => {
    const onResize = () => placeCard(cardRef.current, activeWordRef.current);

    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  function load(word: HTMLElement) {
    const position = wordPosition(word);
    const text = word.textContent ?? "";

    if (!position) {
      return;
    }

    const key = `${position.paragraphOrder}:${position.start}`;
    const known = entriesRef.current.get(key);

    requestRef.current?.abort();
    requestRef.current = null;

    if (known) {
      setState({ status: "found", word: text, entry: known });
      return;
    }

    const controller = new AbortController();
    requestRef.current = controller;
    setState({ status: "loading", word: text });

    fetchDictionaryEntry({ articleSlug, ...position }, controller.signal).then(
      (result) => {
        if (requestRef.current !== controller) {
          return;
        }
        requestRef.current = null;

        if ("entry" in result) {
          entriesRef.current.set(key, result.entry);
          setState({ status: "found", word: text, entry: result.entry });
        } else {
          setState({ status: "failed", word: text, error: result.error });
        }
      },
      () => {
        // Aborted: a newer lookup or closing the card replaced this one.
      },
    );
  }

  /** Shows a marked expression's card, which needs no request. */
  function showExpression(target: HTMLElement, slug: string) {
    const text = target.textContent ?? "";
    const card = cards.get(slug);

    requestRef.current?.abort();
    requestRef.current = null;
    setState(
      card
        ? { status: "expression", word: text, card }
        : { status: "failed", word: text, error: "not_found" },
    );
  }

  function open(word: HTMLElement) {
    const card = cardRef.current;

    if (!card || !wordPosition(word)) {
      return;
    }

    activeWordRef.current?.removeAttribute("data-active");
    activeWordRef.current = word;
    word.setAttribute("data-active", "");
    makeTabStop(word);
    // The browser returns focus to whatever had it when the card opened, so
    // make that the word; a click alone would leave it on the page.
    word.focus({ preventScroll: true });

    if (word.dataset.e === undefined) {
      load(word);
    } else {
      showExpression(word, word.dataset.e);
    }

    if (!card.matches(":popover-open")) {
      card.showPopover();
    }
    placeCard(card, word);
    card.focus({ preventScroll: true });
  }

  // Runs whenever the card opens or closes. Closing happens by the close
  // button, Escape, or a click elsewhere; focus returns to the word if it
  // was in the card.
  function handleToggle() {
    const card = cardRef.current;

    if (!card || card.matches(":popover-open")) {
      return;
    }

    requestRef.current?.abort();
    requestRef.current = null;
    setState({ status: "closed" });

    const word = activeWordRef.current;
    activeWordRef.current = null;
    word?.removeAttribute("data-active");

    const focused = document.activeElement;
    if (word && (focused === document.body || card.contains(focused))) {
      word.focus({ preventScroll: true });
    }
  }

  function handleClick(event: MouseEvent) {
    // Selecting text by dragging should not open the card.
    if (isWord(event.target) && window.getSelection()?.isCollapsed !== false) {
      open(event.target);
    }
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (!isWord(event.target)) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      open(event.target);
    } else if (moveBetweenWords(event.target, event.key)) {
      event.preventDefault();
    }
  }

  return (
    <>
      {/* Listens for events from the words; lays out nothing itself. */}
      <div className="contents" onClick={handleClick} onKeyDown={handleKeyDown}>
        {children}
      </div>

      <div
        ref={cardRef}
        popover="auto"
        role="dialog"
        aria-labelledby={headingId}
        tabIndex={-1}
        onToggle={handleToggle}
        className="word-lookup bg-surface text-ink shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <h2
            id={headingId}
            lang="en"
            className="font-serif text-2xl leading-tight font-semibold wrap-break-word"
          >
            {state.status === "closed"
              ? ""
              : state.status === "expression"
                ? state.card.expression
                : state.word}
          </h2>
          <button
            type="button"
            aria-label="Close"
            onClick={() => cardRef.current?.hidePopover()}
            className="-mt-2 -mr-2 inline-flex size-11 shrink-0 items-center justify-center rounded-lg text-2xl leading-none text-ink-muted hover:bg-paper hover:text-ink"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div aria-live="polite" aria-busy={state.status === "loading"}>
          {state.status === "loading" && <LoadingEntry />}
          {state.status === "found" && <EntryDetails entry={state.entry} />}
          {state.status === "expression" && (
            <>
              <ExpressionDetails card={state.card} surface={state.word} />
              <p className="mt-4 text-xs text-ink-muted">
                {EXPRESSION_SOURCE_NOTE}
              </p>
            </>
          )}
          {state.status === "failed" && (
            <LookupFailure
              error={state.error}
              onRetry={() => {
                if (activeWordRef.current) {
                  load(activeWordRef.current);
                }
              }}
            />
          )}
        </div>
      </div>
    </>
  );
}

function LoadingEntry() {
  return (
    <div className="mt-3">
      <p className="sr-only">Looking up the word…</p>
      <div aria-hidden="true" className="animate-pulse space-y-3">
        <div className="h-4 w-1/3 rounded bg-rule" />
        <div className="h-5 w-2/3 rounded bg-rule" />
        <div className="h-4 w-full rounded bg-rule" />
        <div className="h-4 w-5/6 rounded bg-rule" />
      </div>
    </div>
  );
}

function EntryDetails({ entry }: { entry: DictionaryEntry }) {
  const showLemma =
    entry.lemma !== null &&
    entry.lemma.toLocaleLowerCase("en") !== entry.word.toLocaleLowerCase("en");
  // The pronunciation is the lemma's, so it follows the lemma.
  const facts = [
    entry.partOfSpeech,
    showLemma ? `from “${entry.lemma}”` : null,
    entry.ipa,
  ].filter(Boolean);

  return (
    <div className="mt-1">
      {facts.length > 0 && (
        <p className="text-sm text-ink-muted">{facts.join(" · ")}</p>
      )}
      <p lang="tr" className="mt-3 text-lg leading-snug font-semibold">
        {entry.turkishMeaning}
      </p>
      <p lang="en" className="mt-2 leading-relaxed">
        {entry.englishDefinition}
      </p>
      {entry.exampleSentence && (
        <p
          lang="en"
          className="mt-3 border-l-2 border-rule pl-3 leading-relaxed text-ink-muted italic"
        >
          {entry.exampleSentence}
        </p>
      )}
      <p className="mt-4 text-xs text-ink-muted">
        Explained by AI for this sentence. It can make mistakes.
      </p>
    </div>
  );
}

const FAILURES: Record<
  DictionaryLookupError,
  { message: string; canRetry: boolean }
> = {
  not_found: { message: "This word can’t be looked up.", canRetry: false },
  no_entry: {
    message: "This word isn’t in the dictionary yet.",
    canRetry: false,
  },
  invalid_request: {
    message: "This word can’t be looked up.",
    canRetry: false,
  },
  rate_limited: {
    message:
      "That was a lot of lookups at once. Wait a moment, then try again.",
    canRetry: true,
  },
  unavailable: {
    message: "The dictionary isn’t available right now.",
    canRetry: true,
  },
};

function LookupFailure({
  error,
  onRetry,
}: {
  error: DictionaryLookupError;
  onRetry: () => void;
}) {
  const { message, canRetry } = FAILURES[error];

  return (
    <div className="mt-3">
      <p>{message}</p>
      {canRetry && (
        <button
          type="button"
          onClick={onRetry}
          className={`${secondaryButton} mt-4`}
        >
          Try again
        </button>
      )}
    </div>
  );
}
