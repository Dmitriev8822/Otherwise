const { runAiDiagnostics } = require('./diagnostics');

runAiDiagnostics()
  .then((report) => {
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.status === 'error' ? 1 : 0;
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
