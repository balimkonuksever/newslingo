# Source approval record: GOV.UK news

- Status: Accepted on 2026-10-27, for stories picked by hand
- Reviewed: 2026-10-26, by Claude, from the licence, GOV.UK's API documentation and the live API
- Decision: ADR-004

The plan requires this record before a source is used (§14.1). Rows marked _added_ go beyond §14.1's list, because Claude reads a story's text to adapt it and because sources can be withdrawn.

## Record

| Item                    | Record                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Provider and publisher  | GOV.UK, run by the Government Digital Service. Each story is a news story or press release from a UK government department or agency, published under that body's name.                                                                                                                                                                                                                                                 |
| Terms and review date   | The Open Government Licence v3.0, which GOV.UK applies to all its content except where a page says otherwise; GOV.UK's reuse page (updated 2022-12-09); the Content API documentation (beta, undated). Reviewed 2026-10-26.                                                                                                                                                                                             |
| Commercial use          | Allowed: the licence permits commercial and non-commercial use.                                                                                                                                                                                                                                                                                                                                                         |
| Derivative use          | Allowed: the licence permits adapting the information. Adapting a story for learners and translating it into Turkish are both adaptations.                                                                                                                                                                                                                                                                              |
| AI processing (_added_) | Allowed: the licence does not limit how an adaptation is made, and the Content API may be used for any purpose without an agreement. Claude reads and adapts each story in a Claude Code session.                                                                                                                                                                                                                       |
| Allowed stored content  | Newslingo stores its adaptation and the story's title, address, department and publication time, not GOV.UK's text. The licence does not cover personal data, departmental logos, crests and the Royal Arms, trade marks, third-party material such as photos credited to others, or anything a page marks as outside the licence. Adaptations show none of these, and name only public figures acting in public roles. |
| Required attribution    | Name the department and GOV.UK, link to the original page, and include the statement “Contains public sector information licensed under the Open Government Licence v3.0.” with a link to the licence. Nothing may suggest that the government endorses Newslingo or its adaptations.                                                                                                                                   |
| Images                  | Not used. Logos and crests are outside the licence and photos may belong to others, and the plan's default is to omit images.                                                                                                                                                                                                                                                                                           |
| Retention and deletion  | The licence sets no limits, and nothing but the adapted articles is stored. An adapted article keeps its source's address, department and publication time for as long as it exists.                                                                                                                                                                                                                                    |
| Rate limits             | Content API: 10 requests a second per client, with requests over the limit held and possibly timing out. Search API: no published figure; GOV.UK limits a client that makes too many requests until its rate drops. A writing session makes a few requests at a time.                                                                                                                                                   |
| Withdrawal (_added_)    | Every Content API response has a `withdrawn_notice` field, empty on live pages. Claude adapts only stories whose notice is empty. Nothing checks published adaptations automatically while M6 is on hold; if a source is withdrawn, the article is archived first and reviewed after, as the sensitive-news policy says.                                                                                                |
| Approval owner          | The project owner, who chose GOV.UK on 2026-10-27.                                                                                                                                                                                                                                                                                                                                                                      |

## How stories are picked

- **Finding stories:** `GET https://www.gov.uk/api/search.json`, filtered to the `content_store_document_type` values `news_story` and `press_release`, newest first (`order=-public_timestamp`). Speeches, statements, consultations and other document types are not used. In a writing session Claude proposes a few recent stories for a category that the sensitive-news policy allows.
- **Reading one:** `GET https://www.gov.uk/api/content/<path>` returns the body as HTML, `first_published_at`, `public_updated_at`, `withdrawn_notice`, the lead departments (`details.emphasised_organisations`), and all departments and topics (`links.organisations`, `links.taxons`).
- **Source fields:** the page's address, `https://www.gov.uk` followed by its `base_path`, is the article's source URL, so each story is adapted at most once. The source name is the lead department's name, such as “Department of Health and Social Care”, and the attribution adds “GOV.UK” and the licence statement. The source's publication time is `first_published_at`.
- **Political pages:** GOV.UK marks pages tied to the current government's policies with `details.political`. That covered 35 of 50 items in the week to 2026-10-25, so it says little on its own; every adaptation attributes the government's claims to it instead.
- **Volume:** 98, 103, 115 and 121 items in the four weeks to 2026-10-25, about 15 a day.
- **If automated ingestion resumes (M6):** `content_id`, a stable UUID, becomes the provider article ID, and a table covered by tests maps departments and topics to categories, because department slugs change when government is reorganised (for example `department-for-business-innovation-science-and-trade` in October 2026).

## Coverage by category

Measured with the Search API on 2026-10-26 for the week of 19–25 October 2026 unless stated.

| Category      | What GOV.UK offers                                                                                                          | Expected supply                      |
| ------------- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| AI            | Government AI policy, regulation and research. 8 items matched a search for “artificial intelligence”.                      | About 2 a week about AI itself       |
| Technology    | Science and technology news from the business, innovation, science and trade department, plus regulators.                   | Some each week, many administrative  |
| Business      | The Treasury (7), the business, innovation, science and trade department (5) and the Competition and Markets Authority (2). | Several each week                    |
| World         | The Foreign, Commonwealth and Development Office (5) and the Prime Minister's office (12), from the UK's point of view.     | A few each week                      |
| Entertainment | The digital, culture, media and sport department (5), mostly arts, media and sport policy.                                  | Occasional; explainers fill the rest |
| Beauty        | Regulation of cosmetic products and procedures: one story in the 90 days to 2026-10-25.                                     | Almost none; explainers cover it     |

## Open points

- The reviewer checks that the original page states no exception to the licence (the reviewer checklist in `docs/editorial/sensitive-news.md`), since a page can say so in free text.
- If M6 resumes, it confirms the withdrawal notice's format on a real withdrawn page, since none appeared in the searches made for this record.

## Sources

- Open Government Licence v3.0: <https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/>
- Reuse GOV.UK content: <https://www.gov.uk/help/reuse-govuk-content>
- GOV.UK Content API: <https://content-api.publishing.service.gov.uk/>
- GOV.UK Search API: <https://docs.publishing.service.gov.uk/repos/search-api/using-the-search-api.html>
