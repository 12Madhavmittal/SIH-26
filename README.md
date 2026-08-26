# Annadata Direct

**Annadata Direct** is a demo-ready digital marketplace built for **Smart India Hackathon 2026, Problem Statement 26033**: “Multiple intermediaries reduce farmers earnings and increase consumer prices.” It makes the direct farmer/FPO-to-buyer pathway visible from a source-backed market-price reference through FPO aggregation, farmer-level lot traceability, order clustering, and a last-mile delivery plan.

The product is intentionally structured around the Ministry of Consumer Affairs problem statement: the value proposition is not merely online ordering. It is a transparent, measurable, coordinated trade model that shows where every rupee and kilogram flows.

| Capability | What the prototype demonstrates |
| --- | --- |
| Direct marketplace | Consumers and institutional buyers compare offers from FPO-coordinated farmer lots, place a demo order, and see the consolidation outcome. |
| Transparent pricing | Each listing compares a direct-trade price with an illustrative conventional-chain counterfactual and shows farmer earnings, FPO services, packing, logistics, and buyer savings. |
| Traceable FPO aggregation | Small-farmer contributions remain attached to the buyer-ready lot through anonymised farmer codes, contribution weights, harvest clusters, grades, and dates. |
| Demand intelligence | The forecast uses an explainable rules-based demonstration model based on recent direct orders, committed bulk demand, public-market arrival direction, and planned supply. |
| Logistics coordination | A capacity-aware delivery wave groups orders, compares baseline and consolidated routes, and exposes estimated cost and emission savings. |
| Impact command center | The dashboard tracks direct-trade value, farmer-income uplift, buyer savings, waste avoidance, route efficiency, delivery performance, and a methodology note. |

## Demo-data integrity

The product uses the **Current Daily Price of Various Commodities from Various Markets (Mandi)** dataset published by the Ministry of Agriculture and Farmers Welfare / Department of Agriculture and Farmers Welfare on data.gov.in. The recorded market anchors were retrieved on **26 August 2026**, including tomato, onion, groundnut, and paddy modal prices. Values are labelled as dated mandi references rather than live prices.

All named farmer codes, FPO profiles, order amounts, delivery plans, forecasts, price-chain assumptions, and impact metrics are **illustrative demo data**. They were designed around the official source structure, not presented as live identities or verified transactions. A production deployment would connect the data model to verified onboarding, FPO documentation, live AGMARKNET/eNAM retrieval, inventory records, proof-of-delivery, and consent-governed farmer data.

## Local workflow

Run `pnpm test` for the demand, pricing, traceability, and route calculation tests. The database schema includes organisations, farmers, listings, lots, contributions, orders, and delivery plans; demo content is served through the public marketplace API so the judging flow remains reliable without seeding the production database.

## References

[1] [Smart India Hackathon, official FAQ](https://www.sih.gov.in/faqs)

[2] [AGMARKNET 2.0, Directorate of Marketing & Inspection](https://agmarknet.gov.in/)

[3] [Current Daily Price of Various Commodities from Various Markets (Mandi), data.gov.in](https://data.gov.in/resource/current-daily-price-various-commodities-various-markets-mandi)

[4] [Small Farmers’ Agri-Business Consortium](https://sfacindia.com/FPOS.aspx)
