migrate(
  (app) => {
    const records = app.findRecordsByFilter('congregacoes', '1=1', '', 0, 0)
    for (const r of records) {
      app.delete(r)
    }
  },
  (app) => {},
)
