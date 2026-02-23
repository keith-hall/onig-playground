// Node.js test runner for Oniguruma playground tests
const OnigModule = require('./onig-node.js');
global.OnigModule = OnigModule;

const OnigPlaygroundTests = require('./test.js');

(async () => {
    const tests = new OnigPlaygroundTests();
    const allPassed = await tests.runAllTests();
    process.exit(allPassed ? 0 : 1);
})();
