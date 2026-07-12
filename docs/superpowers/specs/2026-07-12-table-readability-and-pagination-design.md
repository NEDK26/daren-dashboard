# Table Readability and Pagination Design

## Scope

Improve the existing desktop-first tables only. Mobile UI optimisation is explicitly out of scope and will be handled separately.

## Readability

Keep the current fixed-width columns and truncation so wide tables remain usable. Columns that truncate user-facing text will show the complete value in an Ant Design tooltip on hover: video title, tags, violation description, compliance description, node name, appeal, and the corresponding long-text columns in the daren and audit tables.

Links and screenshot cells keep their existing specialised renderers.

## Pagination

The daren list, video list, and audit-log list will each expose Ant Design's page-size selector with `20`, `50`, and `100` rows per page. Each page owns its selected size, returns to page one when it changes, and includes the selected size in the existing API request limit and offset calculation.

## Verification

Add frontend source tests for tooltip rendering and page-size selectors. Run the focused test, full `npm test`, `npm run build`, and `git diff --check`.
