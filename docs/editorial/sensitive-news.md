# Sensitive-news policy

- Status: Draft, awaiting the project owner's approval
- Date: 2026-10-26
- Applies to: choosing GOV.UK stories and explainer topics, writing them, and every review before publication (milestone W). The ingestion rules near the end apply only if M6 resumes.

Newslingo adapts news and writes explainers so that Turkish speakers can practise English. Learners pick an article to study: they read it slowly, open its words and may come back to it. They have chosen to learn, not to follow the news. This policy decides which stories and topics Newslingo writes about, which wait for the user to decide, and how difficult subjects are written about.

It covers the sensitive-news part of the editorial adaptation policy that M0 requires. Milestone W's editorial rules cover the rest for written articles: source wording, facts and translation.

## Outcomes

| Outcome | Meaning                                                                                            | Applied by                         |
| ------- | -------------------------------------------------------------------------------------------------- | ---------------------------------- |
| Include | The story or topic may be written up. The user still reviews every article before it is published. | Claude, when no rule below matches |
| Hold    | The user decides, using this policy, before Claude writes it.                                      | Claude proposes; the user decides  |
| Exclude | Never written up.                                                                                  | Claude and the user                |

When Claude proposes a batch, it says which proposals are held and why.

## Exclude

Never write up a story or explainer whose main subject is:

1. **Advertising:** sponsored or promotional content, product promotions, deals and affiliate posts, or an announcement whose main purpose is to sell.
2. **Opinion:** editorials, columns, reviews, speeches and campaign material. Newslingo adapts reported news.
3. **Graphic violence or cruelty**, including detailed descriptions of injuries, torture or killings.
4. **Sex or sexual violence.**
5. **Suicide or self-harm.**
6. **Harm to a particular child**, or any story that could identify a child involved in a crime, abuse or a court case.
7. **A private individual:** the crimes, accidents, court cases, illnesses or deaths of people who are not public figures.
8. **Rumour or gossip:** unconfirmed reports, claims resting on one anonymous source, and celebrities' private lives, relationships or health.
9. **Advice:** on medical treatment, diets and weight loss, supplements, cosmetic procedures, investments, cryptocurrency or betting.
10. **Gambling, alcohol, tobacco or vaping**, when the story promotes them.
11. **Hate speech or extremist material**, or a story that cannot be told without quoting slurs.
12. **Satire**, or a story with too few facts for an article at its target level.

## Hold for review

The user decides whether Claude writes about:

1. **War, armed conflict or terrorism.** Suitable when the story is about diplomacy, aid, peace talks, policy or consequences rather than the fighting itself.
2. **Disasters, major accidents or epidemics.**
3. **Elections, political parties or protests.**
4. **Turkey**, as set out in the next section.
5. **Crime, courts or policing**, when the story is about laws, institutions or public figures acting in public roles.
6. **Health and medicine**, including public health, medicines and cosmetic or medical procedures.
7. **Religion, ethnicity or migration.**
8. **The death of a public figure.**
9. **A product launch or company announcement**, which can read as advertising. Most common in AI, Technology and Beauty.

A story about these subjects that was first published less than 24 hours earlier waits until a day has passed, since early facts often change.

## Turkey

Most readers will be in Turkey, where some speech is a crime: insulting the President (Penal Code art. 299), degrading the Turkish nation or the state's institutions (art. 301), spreading terrorist propaganda (Anti-Terror Law 3713, art. 7) and publicly spreading misleading information (Penal Code art. 217/A, added in 2022). The authorities can also block access to a whole website under Law 5651, as they did with Wikipedia from 2017 to 2019.

Proposed default, to confirm with a lawyer: at launch, Newslingo does not adapt stories about Turkish domestic politics, and holds every other story that mentions Turkey, Cyprus or the PKK.

## Handling rules

An article about a held subject, and its Turkish translation, follow these rules, and the user checks them:

- Attribute disputed or official claims to whoever makes them: “the UK government says”, “according to the United Nations”. Never present one side's claim as fact. The Turkish keeps the attribution and the same degree of certainty.
- Give casualty and damage figures with their source and date.
- Describe events without graphic detail. Do not name the perpetrators of mass-casualty attacks unless the story is about their prosecution.
- Never name a private individual. Name public figures only in their public role. Never give details that could identify a child.
- Mention a person's ethnicity, religion, nationality, sexuality, health or immigration status only when the story depends on it, and describe groups as they describe themselves.
- Crime: say “accused of” or “charged with” until a court convicts, and report denials.
- Health and science: report what an institution or study found, with its limits, and never advise readers.
- Business: report results and decisions, and never suggest buying or selling.
- Government announcements: present aims as aims and plans as plans, attributed to the government.
- Keep the headline and the tone factual and calm.

## After publication

If a published article turns out to break this policy, or its source is withdrawn or corrected, archive it first and investigate afterwards. Archiving takes effect at once (M5).

## If automated ingestion resumes (M6)

M6 would classify each candidate before ranking it, without AI calls, so its rules are simple and cautious: when a rule cannot tell, it holds a story rather than rejecting it, and every hold and rejection records the rule and the words that triggered it. The rules would live in code with tests, and the terms below are a starting list to tune once real runs show which terms hold too much or too little. Claude can use the same terms when proposing GOV.UK stories by hand.

| Rule                                                                                                                                                                              | Outcome | Reason recorded                  |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | -------------------------------- |
| The provider labels the item as something other than news, such as opinion, a review or a speech. GOV.UK items of any type but news stories and press releases are never fetched. | Exclude | Not news                         |
| The source page is withdrawn                                                                                                                                                      | Exclude | Withdrawn                        |
| “Sponsored”, “advertisement”, “promoted” or “affiliate” in the title or description                                                                                               | Exclude | Advertising                      |
| Fewer than 150 words of body text                                                                                                                                                 | Exclude | Too little content               |
| A hold term in the title, the description or the first 300 words of the body                                                                                                      | Hold    | The subject and the matched term |

Terms match whole words, ignoring case and accents, so “Erdogan” matches “Erdoğan”.

| Subject                        | Starting hold terms                                                                                                                                                  |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| War and terrorism              | war, armed conflict, military, troops, missile, airstrike, bomb, explosion, terror, terrorism, terrorist, hostage, ceasefire, invasion, genocide, atrocity, massacre |
| Violence and death             | attack, shooting, stabbing, killed, killing, murder, dead, death, deaths, died, fatal, injured                                                                       |
| Crime and justice              | arrest, arrested, charged, convicted, sentenced, jailed, prison, trial, court, police, fraud, trafficking                                                            |
| Abuse, sex and self-harm       | abuse, exploitation, grooming, sexual, rape, assault, suicide, self-harm, overdose                                                                                   |
| Disasters and health           | earthquake, flood, wildfire, hurricane, crash, collision, outbreak, epidemic, pandemic, disease, cancer, vaccine, surgery, cosmetic procedure, injection             |
| Politics and protest           | election, referendum, opposition, protest, riot, coup                                                                                                                |
| Religion, ethnicity, migration | religion, religious, mosque, church, synagogue, temple, migrant, migration, asylum, refugee, deportation, ethnic, racism, racist                                     |
| Turkey                         | Turkey, Türkiye, Turkish, Ankara, Istanbul, Erdoğan, Cyprus, PKK                                                                                                     |
| Advice and promotion           | diet, weight loss, supplement, cryptocurrency, crypto, gambling, betting, casino, alcohol, tobacco, smoking, vaping, vape                                            |

## Reviewer checklist

Before Claude writes about a held subject, and before publishing any article, the user confirms that:

1. Nothing on the exclude list is the story's main subject.
2. The facts are settled: the story is more than a day old if it is about a held subject, and figures are attributed and dated.
3. Claims are attributed, and the Turkish keeps the attribution and its certainty.
4. No private individual is named and no child can be identified.
5. There is no graphic detail, advice or promotion.
6. Nothing in the story is a risk under the Turkey section. When unsure, reject.
7. For GOV.UK news, the original page states no exception to its licence.

## Open questions for the project owner

1. Turkey: accept the proposed default, and ask a lawyer to confirm it before launch? Proposed: yes.
2. Audience: is Newslingo for adults only? If teenagers preparing for exams use it, the exclude list should grow. Proposed: adults.
3. Levels: may held subjects be written at A2, where simplified English makes careful attribution harder? Proposed: B1 and above only.

## References

- `IMPLEMENTATION_PLAN.md` M0, milestone W, M6, §14 and §19
- ADR-004, the news source: `docs/adr/0004-news-provider.md`
