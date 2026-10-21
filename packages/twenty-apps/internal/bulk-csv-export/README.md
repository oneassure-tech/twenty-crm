# Bulk CSV export

Twenty app that exports an object to CSV in pages of 200 records. It does not replace or intercept the built-in Export view.

The command menu item **Bulk CSV export** creates an `exportJob`, then asks the server for one page at a time. Each page is stored as an `exportChunk`. When the last page is done, the server joins the pages, uploads one CSV, and attaches it to the job.

The current table view filter is not available to a front component, so this export covers:

- every record on the object you name, or
- the rows selected in the table (up to 200), or
- an optional REST filter such as `name.firstName[ilike]:"ada"`

## Try it on UAT

From this directory, point the Twenty CLI at the UAT workspace and sync the app. Do not install it on production until UAT has been checked.

```bash
yarn install
yarn twenty remote:add --api-url https://crm.uat.non-prod.oneassure.in --as uat
yarn twenty remote:use uat
yarn twenty dev --once
```

Then in the UAT workspace:

1. Open the command menu and run **Bulk CSV export**.
2. Enter the REST plural name (`people`, `companies`, `leads`, or whatever the object is called).
3. Start the export and wait until it offers **Download CSV**.
4. Confirm the same file is on the new **Bulk exports** record, and that the built-in Export view still works.

`yarn twenty dev` without `--once` keeps watching and re-syncs while you edit the app.
