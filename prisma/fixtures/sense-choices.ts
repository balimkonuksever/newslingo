import type { SenseChoices } from "../editorial-dictionary";

/**
 * The sense of every spelling that has several in the demo articles: by
 * article and paragraph, each spelling's sense ids in the order it occurs.
 */
export const DEMO_SENSE_CHOICES: SenseChoices = {
  "three-neighbouring-countries-sign-river-agreement": {
    1: {
      that: ["that-relative"],
      end: ["end-noun"],
      which: ["which-relative"],
    },
    2: { competition: ["competition-rivalry"] },
    3: {
      that: ["that-relative", "that-conjunction"],
      which: ["which-relative"],
      dry: ["dry-weather"],
    },
    4: {
      which: ["which-relative"],
      most: ["most-superlative"],
      talks: ["talks-negotiations"],
    },
    5: {
      that: ["that-conjunction", "that-relative", "that-conjunction"],
      most: ["most-superlative"],
    },
    6: {
      that: ["that-conjunction"],
      yet: ["yet-but", "yet-still"],
    },
    7: {
      note: ["note-mention"],
      that: ["that-conjunction"],
      next: ["next-following"],
      dry: ["dry-weather"],
    },
  },
  "farmers-turn-to-ai-weather-forecasts": {
    1: {
      conditions: ["condition-situation"],
      that: ["that-demonstrative"],
      field: ["field-crops"],
      next: ["next-following"],
    },
    2: {
      about: ["about-to"],
      conditions: ["condition-situation"],
      change: ["change-verb"],
      that: ["that-relative"],
    },
    3: {
      most: ["most-majority"],
      field: ["field-crops"],
    },
    4: {
      too: ["too-excess", "too-excess"],
      leave: ["leave-cause"],
      field: ["field-crops"],
      which: ["which-relative"],
      last: ["last-previous"],
    },
    6: {
      cost: ["cost-noun"],
      that: ["that-conjunction", "that-relative"],
      most: ["most-superlative", "most-superlative"],
    },
    7: {
      most: ["most-majority"],
      that: ["that-conjunction", "that-conjunction"],
      work: ["work-verb"],
      which: ["which-question"],
      field: ["field-crops"],
    },
  },
  "more-people-repair-their-phones": {
    1: {
      screen: ["screen-device"],
      repair: ["repair-verb", "repair-noun", "repair-noun"],
      help: ["help-verb"],
    },
    2: {
      change: ["change-noun"],
      that: ["that-conjunction"],
    },
    3: {
      end: ["end-up"],
      that: ["that-demonstrative", "that-conjunction"],
      repair: ["repair-noun"],
      most: ["most-majority"],
      screen: ["screen-device"],
    },
    4: {
      repair: ["repair-noun", "repair-noun", "repair-noun"],
      which: ["which-relative"],
      open: ["open-verb", "open-verb"],
      that: ["that-relative", "that-relative"],
    },
    5: {
      repair: ["repair-verb", "repair-noun"],
      next: ["next-to", "next-following"],
      help: ["help-noun"],
      atmosphere: ["atmosphere-mood"],
    },
    6: {
      last: ["last-continue"],
      screen: ["screen-device"],
      run: ["run-down"],
      too: ["too-excess"],
    },
  },
  "bakery-delivers-bread-by-bicycle": {
    2: {
      work: ["work-noun"],
    },
    3: {
      leave: ["leave-depart"],
      next: ["next-following"],
    },
    4: {
      about: ["about-approximately"],
    },
    5: {
      next: ["next-following"],
      too: ["too-also"],
      that: ["that-relative"],
    },
  },
  "old-cinema-reopens-with-films-chosen-by-neighbours": {
    1: {
      that: ["that-relative"],
      screen: ["screen-cinema"],
    },
    2: {
      cost: ["cost-verb"],
      too: ["too-excess"],
      run: ["run-manage"],
      most: ["most-majority"],
      help: ["help-verb"],
    },
    3: {
      most: ["most-superlative"],
      about: ["about-topic"],
    },
    5: {
      that: ["that-conjunction"],
      open: ["open-adjective"],
      work: ["work-noun"],
      talks: ["talks-events"],
    },
  },
  "skincare-routines-are-getting-shorter": {
    1: {
      last: ["last-previous"],
    },
    2: {
      cost: ["cost-noun"],
      benefit: ["benefit-noun"],
      dry: ["dry-skin"],
      work: ["work-out"],
      which: ["which-question"],
    },
    3: {
      most: ["most-majority", "most-superlative"],
      that: ["that-relative"],
    },
    4: {
      that: ["that-demonstrative"],
      benefit: ["benefit-verb"],
    },
    5: {
      that: ["that-relative", "that-conjunction", "that-conjunction"],
    },
  },
};
