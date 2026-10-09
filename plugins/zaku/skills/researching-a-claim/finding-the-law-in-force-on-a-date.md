# Finding the Law in Force on a Date

Open this when a law is read at a date in the EU, the UK or Vietnam. It carries the route to the version
in force in each, the field that misleads, and the route behind a page that does not load. Each route
tried goes under `Routes tried` in the research note, with what it returned.

## Before any jurisdiction

1. Write the date that matters: the conduct, the signing, the hearing, the launch or today.
2. Write which instrument the question means. Where it names a subject rather than an instrument ("the
   law on X"), list each instrument that has governed that subject across the dates in play, because a
   law that has been replaced and the law that replaced it both answer to the same name.
3. For each instrument, find its commencement article, its amending instruments and their commencement
   articles, and the article that ended it, if one did.
4. Read the transitional articles of whichever instrument is in force on the date that matters.
5. Read the rule on how a document applies across time in the law that governs law-making in that
   jurisdiction, and cite its article: it decides whether a later provision reaches earlier conduct.

## European Union

- EUR-Lex publishes consolidated versions, each "the legal rules that are applicable at a certain point
  in time", and "Consolidated texts have no legal effect. They are intended for use as documentation
  only" (EUR-Lex, "Consolidated texts"). The note cites the Official Journal text for any clause it
  rests on.
- The date in a consolidated text's header is the date its latest included amendment becomes
  applicable (same page). A consolidated version's CELEX number is "0", the basic act's number, "-" and
  that date, so the version in force on a date is the latest one whose date suffix is on or before it.
- When eur-lex.europa.eu returns an empty page to a fetch, the Publications Office's SPARQL endpoint,
  `https://publications.europa.eu/webapi/rdf/sparql`, lists an act's consolidated CELEX numbers, and an
  archived snapshot carries EUR-Lex's help pages.

## United Kingdom

- legislation.gov.uk takes a date in the URI: `/<type>/<year>/<number>/<YYYY-MM-DD>` is the version in
  effect on that date, `/enacted` or `/made` the original text, and `/prospective` the text with every
  provision not yet in force applied (legislation.gov.uk, developer documentation, "URIs").
- A revised text can lag an amendment: the site aims to apply one "within a maximum of three months of
  the coming into force date", and its "Changes to Legislation" message lists the effects not yet
  applied (legislation.gov.uk, Help). The note reads that message for the version it cites.
- A section often comes into force by a commencement order rather than by the act's own date, and the
  site marks text not yet in force as prospective.
- When the site returns an empty body to a fetch, an archived snapshot of the dated URI is the next
  route, cited with the snapshot's date.

## Vietnam

- The National Database on Legal Documents (vbpl.vn, Ministry of Justice) renders in the browser, so a
  fetch of a document page returns only its shell. The page's scripts call a JSON gateway: `GET
  https://vbpl-bientap-gateway.moj.gov.vn/api/qtdc/public/doc/<id>` answers without a token. Its fields
  include `docNum`, `issueDate`, `effFrom`, `effTo`, `effStatus`, `isConsolidatedDocument`,
  `documentContent` (the text as HTML) and `documentContentFileName` (the original PDF). The listing
  and search endpoints need a token. The `<id>` is the document's `ItemID` from the database's older
  page addresses, which a web search for the document number together with "ItemID" finds.
- `documentContent` is the text as enacted. A record whose `effStatus` reads partly expired ("Het hieu
  luc mot phan") has been amended, and its text does not show the amendment. Find the amending law, or
  a consolidated text, and apply each amendment from its own commencement article.
- The Official Gazette (Cong bao, congbao.chinhphu.vn, Government Office) serves server-rendered pages
  with the PDF of each issue on its CDN. The PDF is the published text. Text extracted from a
  Vietnamese PDF can split syllables with stray spaces, so a quotation is checked against
  `documentContent` from the gateway for the same document.
- The Gazette also publishes consolidated texts ("Van ban hop nhat", numbered `<n>/VBHN-<issuer>`),
  which footnote each amended clause with the instrument that amended it.
- The "Hieu luc" field on a Gazette page is not the date of effect. It has shown a law's issue date
  where the law's own effect article sets a later date, and a placeholder date on a consolidated text.
  The date of effect comes from the effect article ("Hieu luc thi hanh") in the text.
- Retroactive effect and the application of documents across time are set by the law on promulgation
  of legal normative documents in force on the date that matters, in its articles titled "Hieu luc tro
  ve truoc cua van ban quy pham phap luat" and "Ap dung van ban quy pham phap luat". The note cites the
  article from the version in force on that date, because the law has been amended and replaced, and
  the article numbers differ between versions.
- English renderings of Vietnamese law on aggregator sites are unofficial translations. A quotation
  the answer rests on is quoted in Vietnamese from the Gazette or the gateway, with the translation
  beside it and labelled as the writer's own or as the site's.
