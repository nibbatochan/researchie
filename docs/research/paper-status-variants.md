# Paper status and update variants

Sources used:
- S1 Crossref update type enum (XSD `cm_update_type`, used by the `type` attribute of `update`): https://gitlab.com/crossref/schema/-/raw/master/schemas/common5.4.0.xsd
- S2 Retraction Watch Database User Guide: https://retractionwatch.com/retraction-watch-database-user-guide/
- S3 Retraction Watch "Building the Database" PDF: https://retractionwatch.com/wp-content/uploads/2023/12/Building-The-Database.pdf (fetched, binary, text not readable; not used for definitions)

Not reachable: Crossref update-policies page (https://www.crossref.org/documentation/content-registration/structural-metadata/update-policies/) returned 404. COPE retraction guidelines (https://publicationethics.org/retraction-guidelines) returned 403 to fetch and curl. No COPE text was read, so COPE definitions are absent.

| Variant | What it means | Crossref update type (exact string) or label | Source URL |
|---|---|---|---|
| Published / accepted, no notice | No update notice exists. No source defines a "Verified" label. | none (no `update` element) | not defined by S1 or S2 |
| Retraction | "if an entire article (or letter, or review, etc.) was indicated as having been removed from publication" (S2). Withdrawn notices are logged as retractions (S2). | `retraction` | S1, S2 |
| Withdrawal | Logged as Retraction by Retraction Watch (S2). Crossref meaning not verified from a primary page. | `withdrawal` | S1, S2 |
| Expression of concern | "any editorial note that is not a retraction or correction which addresses the status or reception of a published item" (S2). | `expression_of_concern` | S1, S2 |
| Removal | Retraction Watch has no removal notice type (S2). Crossref meaning not verified. | `removal` | S1 |
| Correction | "a change has been made to a published article, but that the article has not been removed from publication" (S2). | `correction` | S1, S2 |
| Erratum | Grouped under Correction by Retraction Watch (S2). Crossref meaning not verified. | `erratum` | S1, S2 |
| Corrigendum | Grouped under Correction by Retraction Watch (S2). Crossref meaning not verified. | `corrigendum` | S1, S2 |
| Partial retraction | Filed under Correction: "certain sections or conclusions of an article are deemed invalid and not to be used for citation purposes" (S2). | `partial_retraction` | S1, S2 |
| Addendum | Crossref meaning not verified. | `addendum` | S1 |
| Clarification | Crossref meaning not verified. | `clarification` | S1 |
| New edition | Crossref meaning not verified. | `new_edition` | S1 |
| New version | Crossref meaning not verified. | `new_version` | S1 |
| Reinstatement | Named in S2 search descriptions, no definition given. Not in Crossref enum. | none | S2 (name only) |

## Gaps

- Exact strings come from the Crossref XSD (S1), lowercase with underscores. The Crossref update-policies page was not read.
- Meanings for withdrawal, removal, erratum, corrigendum, addendum, clarification, new edition and new version are not verified from a primary page. Secondary search results conflict on withdrawal (unpublished manuscripts only vs. removal from the publication process) and on removal (only exceptional legal, privacy or safety cases).
- COPE definitions are missing. Secondary material says COPE's guidelines were updated to version 3 in August 2025, not verified.
- Retraction Watch uses only three notice categories: Retraction, Expression of Concern, Correction (S3 per search summary; S3 text not readable, so this relies on S2 wording).
- No source defines a "Verified" label. The badge label must be set by the tool.
