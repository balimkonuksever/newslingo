# ADR-004: News source

- Status: Accepted, chosen by the user on 2026-10-27
- Date: 2026-10-26, proposed; 2026-10-27, accepted with stories picked by hand
- Owners: Newslingo engineering

## Context

M6 was to import raw news candidates, and the plan allows news only from a source whose terms explicitly permit commercial use and derivative content (§14.1, §19). Claude adapts each story and translates it into Turkish, so the terms must also allow that processing. The source has to give enough text to adapt without inventing facts, since a C1 article can reach 900 words. By launch, each category needs about 10–15 active articles.

Claude reviewed the options on 2026-10-26 from the providers' published terms and documentation and from GOV.UK's live API. Some official pages could not be read with Claude's tools. Points taken from other sources are marked _second-hand_ and need checking before anyone relies on them.

On 2026-10-27 the user said the project has no budget for a lawyer or a paid news API.

The options were:

1. **A news aggregator API**, such as NewsAPI.org. NewsAPI's terms (last updated 2020-04-30) grant no rights to the publishers' articles. Customers need their own licence for content that others hold rights in, and may not use the service to republish copyrighted material. Its free plan may not be used in production. Aggregators index publishers' work without licensing it, so none can meet the bar.
2. **A publisher's open API.** The Guardian's free developer key is for non-commercial use, and commercial use needs a separate key and agreement (_second-hand_: from the Guardian's developer forum and third-party summaries, because its own terms page could not be fetched). The New York Times' terms limit its content to personal, non-commercial use and forbid using it to build AI tools (_second-hand_: from reporting on its 2023 terms update).
3. **An AI content-licensing marketplace**, such as TollBit or Dappier. TollBit's two standard licences allow summaries, citations and grounding, or showing the full article, and exclude training and generative reuse. Anything else is a custom licence negotiated with each publisher. Dappier sells retrieval access for AI apps, and no published terms for derivative articles were found.
4. **A news agency or publisher licence**: AP, Reuters, AFP, the Guardian's commercial licensing, or an entertainment and lifestyle agency such as WENN or Bang Showbiz. Newsrooms routinely rewrite agency copy, but none of these publishes terms for AI adaptation and translation, and prices are by quote. Reuters' chief executive has said its AI licensing deals cover archive text, not live news (_second-hand_: Press Gazette).
5. **Openly licensed sources**, where the licence itself grants the rights:
   - **GOV.UK news**, under the Open Government Licence v3.0. It allows anyone to adapt the information and to use it commercially, with attribution. GOV.UK's Content API needs no key or agreement and may be used for any purpose.
   - **Global Voices**, under CC BY 3.0, which allows commercial adaptation and translation with a link and the author's name. It publishes about two long features a day, mostly on politics, human rights and activism.
   - **Wikinews** (CC BY 2.5) has closed: the Wikimedia Foundation made it read-only on 2026-05-04.
   - **Voice of America**, mostly in the public domain, was largely shut down in March 2025. A court ordered its restoration in March 2026, and its future is uncertain.
6. **Writing news from facts alone**: taking facts from headlines and other outlets' reports and keeping none of their text. Facts are not protected by copyright, but this falls short of the plan's explicit rights and would need a lawyer's opinion first.

## Decision

Chosen by the user on 2026-10-27:

1. **GOV.UK news** (option 5) is Newslingo's only news source. Claude picks stories by hand in Claude Code sessions and adapts them there, and the user reviews each one before it is published. The source approval record is `docs/sources/gov-uk.md`.
2. **Explainers**, written from general knowledge with listed references, cover the categories and gaps that GOV.UK cannot (decision log, 2026-10-27).
3. Options 1–4 and 6 are not used. Options 3, 4 and 6 need money or a lawyer's opinion, which the project does not have. The questions below are kept in case that changes.

## Questions for commercial providers

Kept for reference; not being sent.

1. May we adapt your stories into new, shorter articles for English learners at levels A2 to C1, translate them into Turkish, and publish them on a website?
2. May we send your text to a third-party AI model (Anthropic's Claude) to draft those adaptations? On what conditions?
3. Which fields may we store, how much of the text, and for how long? What must we do when you withdraw or correct a story?
4. What attribution and link must each adapted article carry?
5. May we show your images? (We plan not to.)
6. How many stories a day do you publish in each of our categories?
7. How do you deliver them (API or feed), with what rate limits, and with stable story IDs and withdrawal notices?
8. What is the price for reading about 100 stories a day and adapting a few of them?
9. Are there limits by territory? Most readers will be in Turkey.
10. If the licence ends, may adaptations we have already published stay online?

## Consequences

- Milestone W replaces M6–M8, which are on hold: GOV.UK stories and explainers are written in sessions and imported as drafts.
- GOV.UK published 98, 103, 115 and 121 news stories and press releases in the four weeks to 2026-10-25, all from UK government departments and agencies. A rough keyword count put about 2 a week in AI, 8 in Technology, 12 in World and 23 in Business, many of them administrative. They feed Entertainment only through culture policy, and Beauty almost never: in 90 days, one story was about cosmetics. Explainers cover those categories and fill the thin ones.
- Government announcements give the government's view, so adaptations attribute their claims ("the UK government says").
- Every GOV.UK adaptation must carry the licence's attribution statement and a link to the licence. Since 2026-10-27 each news article records its licence, the publication check refuses a GOV.UK story without it, and the "About this article" box (`src/components/article/about-this-article.tsx`) names GOV.UK and shows the statement with a link to the licence.
- The licence does not cover personal data, logos, crests or third-party material such as photos. Adaptations leave out private individuals' names and use no images.
- GOV.UK does not guarantee continued supply, and calls its Content API beta. Because stories are picked by hand, a change to the API affects only the writing sessions, never the site.

## References

- `IMPLEMENTATION_PLAN.md` M0, milestone W, M6, §14 and §19
- Open Government Licence v3.0: <https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/>
- GOV.UK Content API: <https://content-api.publishing.service.gov.uk/>
- GOV.UK Search API: <https://docs.publishing.service.gov.uk/repos/search-api/using-the-search-api.html>
- Reuse GOV.UK content: <https://www.gov.uk/help/reuse-govuk-content>
- NewsAPI terms: <https://newsapi.org/terms>
- TollBit licences: <https://tollbit.com/licensed-rag/>
- Global Voices attribution policy: <https://globalvoices.org/about/global-voices-attribution-policy/>
- Wikinews consultation and closure: <https://meta.wikimedia.org/wiki/Public_consultation_about_Wikinews>
- New York Times terms and AI (2023): <https://rightstech.com/2023/08/the-new-york-times-says-you-cant-use-its-content-to-train-ai-models/>
- Guardian commercial keys (developer forum): <https://groups.google.com/g/guardian-api-talk/c/tp0VfMcamcY>
- Reuters AI licensing and archive text: <https://pressgazette.co.uk/publishers/wires_and_agencies/thomson-reuters-boss-says-ai-licensing-deals-only-involve-archive-text/>
- Voice of America restoration order: <https://www.adn.com/nation-world/2026/03/18/judge-reinstates-1000-voice-of-america-employees-deems-wind-down-illegal/>
